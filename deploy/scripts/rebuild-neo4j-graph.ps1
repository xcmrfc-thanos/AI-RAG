#Requires -Version 5.1
<#
.SYNOPSIS
  触发已发布文档的 Neo4j/KAG 全量图谱重建，并轮询节点规模。

.DESCRIPTION
  1. 登录网关（或使用 -Token）后调用 POST /api/document/documents/graph/rebuild
  2. 可选：同时调用 POST /api/kag/build/all（需网关已配置 /api/kag/**）
  3. 轮询 Neo4j HTTP，打印 KnowledgeDocument / KnowledgeEntity / 关系数

.PARAMETER GatewayUrl
  网关地址，默认 http://127.0.0.1:18080

.PARAMETER Token
  可选 JWT；未提供时用 Username/Password 登录

.PARAMETER WaitSec
  轮询等待秒数，默认 300（LLM 抽取较慢）

.EXAMPLE
  .\rebuild-neo4j-graph.ps1

.EXAMPLE
  .\rebuild-neo4j-graph.ps1 -Token "eyJ..." -WaitSec 600
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$Token = "",
    [string]$Username = "admin",
    [string]$Password = "admin123",
    [string]$Neo4jHttp = $(if ($env:NEO4J_HTTP_URL) { $env:NEO4J_HTTP_URL } else { "http://127.0.0.1:20474" }),
    [string]$Neo4jUser = $(if ($env:NEO4J_USER) { $env:NEO4J_USER } else { "neo4j" }),
    [string]$Neo4jPass = $(if ($env:NEO4J_PASSWORD) { $env:NEO4J_PASSWORD } else { "susan123" }),
    [int]$WaitSec = 300,
    [switch]$AlsoKagBuildAll
)

$ErrorActionPreference = "Stop"

# 登录网关获取 JWT
function Get-GatewayToken {
    param([string]$Url, [string]$User, [string]$Pass)
    $body = @{ username = $User; password = $Pass } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$Url/api/auth/auth/login" -Method Post -ContentType "application/json" -Body $body
    $t = $resp.data.accessToken
    if (-not $t) { $t = $resp.data.token }
    if (-not $t) { throw "login failed: no token" }
    return [string]$t
}

# 查询 Neo4j 图谱规模
function Get-Neo4jGraphCounts {
    param([string]$Http, [string]$User, [string]$Pass)
    $auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${User}:${Pass}"))
    $body = @{
        statements = @(
            @{ statement = "MATCH (d:KnowledgeDocument) RETURN count(d) AS c" }
            @{ statement = "MATCH (e:KnowledgeEntity) RETURN count(e) AS c" }
            @{ statement = "MATCH (c:DocumentChunk) RETURN count(c) AS c" }
            @{ statement = "MATCH ()-[r]->() RETURN count(r) AS c" }
        )
    } | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Uri "$Http/db/neo4j/tx/commit" -Method Post `
        -Headers @{ Authorization = "Basic $auth"; "Content-Type" = "application/json" } -Body $body
    if ($r.errors -and $r.errors.Count -gt 0) {
        throw ("neo4j error: " + ($r.errors | ConvertTo-Json -Compress))
    }
    return @{
        Docs    = [int]$r.results[0].data[0].row[0]
        Ents    = [int]$r.results[1].data[0].row[0]
        Chunks  = [int]$r.results[2].data[0].row[0]
        Rel     = [int]$r.results[3].data[0].row[0]
    }
}

Write-Host "=== Rebuild Neo4j / KAG graph ===" -ForegroundColor Cyan
if (-not $Token) {
    Write-Host "Login $Username @ $GatewayUrl ..."
    $Token = Get-GatewayToken -Url $GatewayUrl -User $Username -Pass $Password
}

$headers = @{
    Authorization  = "Bearer $Token"
    "Content-Type" = "application/json"
}

$before = Get-Neo4jGraphCounts -Http $Neo4jHttp -User $Neo4jUser -Pass $Neo4jPass
Write-Host ("Before: docs={0} ents={1} chunks={2} rels={3}" -f $before.Docs, $before.Ents, $before.Chunks, $before.Rel)

$rb = Invoke-RestMethod -Uri "$GatewayUrl/api/document/documents/graph/rebuild" -Method Post -Headers $headers -Body "{}"
Write-Host ("Triggered document graph/rebuild: code={0} message={1}" -f $rb.code, $rb.message) -ForegroundColor Green

if ($AlsoKagBuildAll) {
    try {
        $kag = Invoke-RestMethod -Uri "$GatewayUrl/api/kag/build/all" -Method Post -Headers $headers -Body "{}"
        Write-Host ("Also triggered /api/kag/build/all: code={0} data={1}" -f $kag.code, $kag.data) -ForegroundColor Green
    }
    catch {
        Write-Host ("WARN: /api/kag/build/all failed (gateway route?): " + $_.Exception.Message) -ForegroundColor Yellow
    }
}

$deadline = (Get-Date).AddSeconds($WaitSec)
$last = $before
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 10
    $last = Get-Neo4jGraphCounts -Http $Neo4jHttp -User $Neo4jUser -Pass $Neo4jPass
    Write-Host ("  polling: docs={0} ents={1} chunks={2} rels={3}" -f $last.Docs, $last.Ents, $last.Chunks, $last.Rel)
    # 有文档节点且实体在增长或已稳定有实体，认为构建在推进；满 wait 后退出
}

Write-Host ("After ~{0}s: docs={1} ents={2} chunks={3} rels={4}" -f $WaitSec, $last.Docs, $last.Ents, $last.Chunks, $last.Rel) -ForegroundColor Cyan
if ($last.Docs -le 0 -or $last.Ents -le 0) {
    Write-Host "WARN: graph still empty/partial — check kb-intelligence logs for empty content / LLM errors" -ForegroundColor Yellow
    exit 2
}
Write-Host "Done." -ForegroundColor Green
exit 0
