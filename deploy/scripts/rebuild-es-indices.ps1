#Requires -Version 5.1
<#
.SYNOPSIS
  重建 Elasticsearch 双索引（kb_document + kb_chunk）并可选触发业务侧全量回填。

.DESCRIPTION
  1. 删除旧索引并按 backend/sql/es/*.json 创建新 mapping
  2. 若 kb-intelligence 已启动且提供 Token，则调用：
     - POST /api/search/index/rebuild  （文档元数据）
     - POST /api/rag/reindex/all       （chunk + 向量；rag.qdrant.enabled 时旁路双写 Qdrant）
  3. 可选：重建前清空 Qdrant 集合 kb_chunk（-ResetQdrant），避免维度漂移残留

.PARAMETER EsHost
  Elasticsearch 地址，默认 http://127.0.0.1:20920

.PARAMETER GatewayUrl
  网关地址，默认 http://localhost:18080

.PARAMETER Token
  可选 JWT，用于触发 rebuild / reindex API

.PARAMETER DocumentId
  可选：仅补偿单个文档（调用 POST /api/rag/reindex/{id}），不删建全量 ES 索引

.EXAMPLE
  .\rebuild-es-indices.ps1

.EXAMPLE
  .\rebuild-es-indices.ps1 -Token "eyJhbGciOi..."

.EXAMPLE
  .\rebuild-es-indices.ps1 -Token "eyJ..." -DocumentId 123456789
#>
param(
    [string]$EsHost = $(if ($env:ES_URL) { $env:ES_URL } else { "http://127.0.0.1:20920" }),
    [string]$EsUser = "elastic",
    [string]$EsPass = $(if ($env:ELASTIC_PASSWORD) { $env:ELASTIC_PASSWORD } else { "susan123" }),
    [string]$GatewayUrl = "http://localhost:18080",
    [string]$Token = "",
    [long]$DocumentId = 0,
    [string]$QdrantUrl = $(if ($env:QDRANT_HTTP_URL) { $env:QDRANT_HTTP_URL } else { "http://127.0.0.1:26333" }),
    [switch]$ResetQdrant
)

$ErrorActionPreference = "Stop"
$script:FailCount = 0
$DeployDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EsDir = Join-Path (Split-Path -Parent $DeployDir) "backend\sql\es"

$pair = "${EsUser}:${EsPass}"
$bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
$base64 = [System.Convert]::ToBase64String($bytes)
$esHeaders = @{
    Authorization = "Basic $base64"
    "Content-Type" = "application/json"
}

# 删除 ES 索引（存在时）
function Remove-EsIndex {
    param([string]$Name)
    try {
        Invoke-RestMethod -Uri "$EsHost/$Name" -Method DELETE -Headers $esHeaders | Out-Null
        Write-Host "  已删除 $Name" -ForegroundColor Yellow
    } catch {
        Write-Host "  跳过删除 $Name（可能不存在）" -ForegroundColor DarkGray
    }
}

# 按 JSON 定义创建 ES 索引
function New-EsIndex {
    param([string]$Name, [string]$JsonPath)
    $body = Get-Content $JsonPath -Raw -Encoding UTF8
    $body = $body -replace 'ik_max_word', 'standard' -replace 'ik_smart', 'standard'
    Invoke-RestMethod -Uri "$EsHost/$Name" -Method PUT -Headers $esHeaders -Body $body | Out-Null
    Write-Host "  已创建 $Name" -ForegroundColor Green
}

# 调用网关 API 触发业务索引回填
function Invoke-GatewayPost {
    param([string]$Path)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    return Invoke-RestMethod -Uri "$GatewayUrl$Path" -Method POST -Headers $headers -Body "{}"
}

function Invoke-GatewayGet {
    param([string]$Path)
    $headers = @{}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    return Invoke-RestMethod -Uri "$GatewayUrl$Path" -Method GET -Headers $headers
}

function Get-ResultPayload {
    param($Result)
    if ($Result.data) { return [string]$Result.data }
    if ($Result.message) { return [string]$Result.message }
    return ""
}

function Wait-ReindexTask {
    param(
        [string]$TaskId,
        [int]$TimeoutSec = 180
    )
    for ($waited = 0; $waited -lt $TimeoutSec; $waited += 2) {
        $result = Invoke-GatewayGet -Path "/api/rag/reindex/progress/$TaskId"
        if ([int]$result.code -ne 200 -or -not $result.data) {
            throw "reindex progress unavailable taskId=$TaskId"
        }
        $progress = $result.data
        $status = [string]$progress.status
        if ($status -eq "COMPLETED") {
            if ([int]$progress.failedDocuments -gt 0) {
                throw "reindex completed with failures taskId=$TaskId failed=$($progress.failedDocuments)"
            }
            Write-Host ("  Chunk 回填完成：{0}/{1}" -f $progress.completedDocuments, $progress.totalDocuments) -ForegroundColor Green
            return
        }
        if ($status -in @("ERROR", "FAILED")) {
            throw "reindex task failed taskId=$TaskId status=$status"
        }
        Start-Sleep -Seconds 2
    }
    throw "reindex task timeout taskId=$TaskId timeout=${TimeoutSec}s"
}

Write-Host "=== 步骤 1/3：等待 Elasticsearch ===" -ForegroundColor Cyan

# 单文档补偿：不删建索引，仅触发 RAG 重建
if ($DocumentId -gt 0) {
    if (-not $Token) {
        Write-Host "单文档补偿需要 -Token" -ForegroundColor Red
        exit 1
    }
    Write-Host "=== 单文档补偿：documentId=$DocumentId ===" -ForegroundColor Cyan
    try {
        $result = Invoke-GatewayPost -Path "/api/rag/reindex/$DocumentId"
        $taskId = Get-ResultPayload -Result $result
        if ([int]$result.code -ne 200 -or -not $taskId) { throw "single document reindex rejected" }
        Wait-ReindexTask -TaskId $taskId
        exit 0
    } catch {
        Write-Host "  单文档补偿失败：$($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-RestMethod -Uri "$EsHost/_cluster/health" -Headers $esHeaders -TimeoutSec 5 | Out-Null
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

Write-Host "=== 步骤 2/3：删建双索引 ===" -ForegroundColor Cyan
Remove-EsIndex -Name "kb_document"
Remove-EsIndex -Name "kb_chunk"
New-EsIndex -Name "kb_document" -JsonPath (Join-Path $EsDir "kb_document_index.json")
New-EsIndex -Name "kb_chunk" -JsonPath (Join-Path $EsDir "kb_chunk_index.json")

if ($ResetQdrant) {
    Write-Host "=== 步骤 2b：重置 Qdrant 集合 kb_chunk ===" -ForegroundColor Cyan
    try {
        Invoke-RestMethod -Uri "$QdrantUrl/collections/kb_chunk" -Method DELETE -TimeoutSec 10 | Out-Null
        Write-Host "  已删除 Qdrant 集合 kb_chunk（reindex 时将按 embedding.dimension 重建）" -ForegroundColor Yellow
    } catch {
        Write-Host "  跳过删除 Qdrant kb_chunk：$($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

Write-Host "=== 步骤 3/3：业务数据回填 ===" -ForegroundColor Cyan
if (-not $Token) {
    Write-Host "  未提供 Token，请手动执行：" -ForegroundColor Yellow
    Write-Host "    POST $GatewayUrl/api/search/index/rebuild"
    Write-Host "    POST $GatewayUrl/api/rag/reindex/all"
    Write-Host "  若已开启 rag.qdrant.enabled，reindex 会旁路双写 Qdrant；可用 -ResetQdrant 先清空集合。" -ForegroundColor Yellow
    Write-Host "  验证：搜索 startTransition（关键词模式）应命中正文片段。" -ForegroundColor Yellow
    exit 0
}

try {
    $docResult = Invoke-GatewayPost -Path "/api/search/index/rebuild"
    if ([int]$docResult.code -ne 200) { throw "document rebuild business code=$($docResult.code)" }
    Write-Host "  文档索引重建：$($docResult.message)" -ForegroundColor Green
} catch {
    Write-Host "  文档索引重建失败：$($_.Exception.Message)" -ForegroundColor Red
    $script:FailCount++
}

try {
    $chunkResult = Invoke-GatewayPost -Path "/api/rag/reindex/all"
    $chunkTaskId = Get-ResultPayload -Result $chunkResult
    if ([int]$chunkResult.code -ne 200 -or -not $chunkTaskId) { throw "chunk rebuild rejected" }
    Write-Host "  Chunk 索引任务：$chunkTaskId" -ForegroundColor Green
    Wait-ReindexTask -TaskId $chunkTaskId
    try {
        $qInfo = Invoke-RestMethod -Uri "$QdrantUrl/collections/kb_chunk" -TimeoutSec 5
        Write-Host ("  Qdrant kb_chunk：points={0} dim={1}" -f $qInfo.result.points_count, $qInfo.result.config.params.vectors.size) -ForegroundColor Green
    } catch {
        Write-Host "  Qdrant 校验跳过（未启用或不可达）：$($_.Exception.Message)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  Chunk 索引重建失败：$($_.Exception.Message)" -ForegroundColor Red
    $script:FailCount++
}

if ($script:FailCount -gt 0) {
    Write-Host "Result: REBUILD FAILED ($script:FailCount step(s))" -ForegroundColor Red
    exit 1
}

Write-Host "Result: REBUILD PASS" -ForegroundColor Green
exit 0
