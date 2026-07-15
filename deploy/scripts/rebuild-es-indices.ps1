#Requires -Version 5.1
<#
.SYNOPSIS
  重建 Elasticsearch 双索引（kb_document + kb_chunk）并可选触发业务侧全量回填。

.DESCRIPTION
  1. 删除旧索引并按 backend/sql/es/*.json 创建新 mapping
  2. 若 kb-intelligence 已启动且提供 Token，则调用：
     - POST /api/search/index/rebuild  （文档元数据）
     - POST /api/rag/reindex/all       （chunk + 向量）

.PARAMETER EsHost
  Elasticsearch 地址，默认 http://127.0.0.1:20920

.PARAMETER GatewayUrl
  网关地址，默认 http://localhost:8080

.PARAMETER Token
  可选 JWT，用于触发 rebuild / reindex API

.EXAMPLE
  .\rebuild-es-indices.ps1

.EXAMPLE
  .\rebuild-es-indices.ps1 -Token "eyJhbGciOi..."
#>
param(
    [string]$EsHost = $(if ($env:ES_URL) { $env:ES_URL } else { "http://127.0.0.1:20920" }),
    [string]$EsUser = "elastic",
    [string]$EsPass = $(if ($env:ELASTIC_PASSWORD) { $env:ELASTIC_PASSWORD } else { "susan123" }),
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$Token = ""
)

$ErrorActionPreference = "Stop"
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

Write-Host "=== 步骤 1/3：等待 Elasticsearch ===" -ForegroundColor Cyan
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

Write-Host "=== 步骤 3/3：业务数据回填 ===" -ForegroundColor Cyan
if (-not $Token) {
    Write-Host "  未提供 Token，请手动执行：" -ForegroundColor Yellow
    Write-Host "    POST $GatewayUrl/api/search/index/rebuild"
    Write-Host "    POST $GatewayUrl/api/rag/reindex/all"
    Write-Host "  验证：搜索 startTransition（关键词模式）应命中正文片段。" -ForegroundColor Yellow
    exit 0
}

try {
    $docResult = Invoke-GatewayPost -Path "/api/search/index/rebuild"
    Write-Host "  文档索引重建：$($docResult.message)" -ForegroundColor Green
} catch {
    Write-Host "  文档索引重建失败：$($_.Exception.Message)" -ForegroundColor Red
}

try {
    $chunkResult = Invoke-GatewayPost -Path "/api/rag/reindex/all"
    Write-Host "  Chunk 索引重建：$($chunkResult.data)" -ForegroundColor Green
} catch {
    Write-Host "  Chunk 索引重建失败：$($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "完成。请在搜索页用「startTransition」验证关键词深搜。" -ForegroundColor Green
