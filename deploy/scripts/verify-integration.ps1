#Requires -Version 5.1
<#
.SYNOPSIS
  Integration smoke checks for AI-RAG middleware (task 46).

.EXAMPLE
  .\verify-integration.ps1
#>
param(
    [string]$EsHost = "http://127.0.0.1:20920",
    [string]$EsUser = "elastic",
    [string]$EsPass = "susan123",
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$RustFsUrl = "http://127.0.0.1:20090",
    [string]$MysqlContainer = "kb-mysql"
)

$gatewayUri = [Uri]$GatewayUrl
$gatewayPort = $gatewayUri.Port

$ErrorActionPreference = "Continue"
$script:PassCount = 0
$script:WarnCount = 0
$script:FailCount = 0

# Write one check line and bump counters
function Write-CheckResult {
    param(
        [string]$Name,
        [ValidateSet("PASS", "WARN", "FAIL")]
        [string]$Status,
        [string]$Detail = ""
    )
    switch ($Status) {
        "PASS" { $script:PassCount++ ; $color = "Green" }
        "WARN" { $script:WarnCount++ ; $color = "Yellow" }
        "FAIL" { $script:FailCount++ ; $color = "Red" }
    }
    $msg = if ($Detail) { "$Name - $Detail" } else { $Name }
    Write-Host "[$Status] $msg" -ForegroundColor $color
}

# TCP port open (preferred for Spring Cloud Gateway)
function Test-TcpPortOpen {
    param([int]$Port)
    try {
        $r = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
        return [bool]$r.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# HTTP reachable if 2xx/3xx or expected auth/forbidden codes (e.g. RustFS 403)
function Test-HttpReachable {
    param(
        [string]$Url,
        [int[]]$AcceptStatusCodes = @(401, 403, 404)
    )
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -UseBasicParsing
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($AcceptStatusCodes -contains $statusCode) {
            return $true
        }
        return $false
    }
}

# Docker container running
function Test-DockerContainerRunning {
    param([string]$Name)
    $status = docker inspect -f "{{.State.Status}}" $Name 2>$null
    return ($status -eq "running")
}

Write-Host ""
Write-Host "=== AI-RAG integration smoke check ===" -ForegroundColor Cyan
Write-Host ("Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ""

$containers = @(
    @{ Name = "kb-mysql"; Label = "MySQL" },
    @{ Name = "kb-redis"; Label = "Redis" },
    @{ Name = "kb-rabbitmq"; Label = "RabbitMQ" },
    @{ Name = "kb-elasticsearch"; Label = "Elasticsearch" },
    @{ Name = "kb-nacos"; Label = "Nacos" },
    @{ Name = "kb-rustfs"; Label = "RustFS" },
    @{ Name = "kb-neo4j"; Label = "Neo4j" },
    @{ Name = "kb-qdrant"; Label = "Qdrant" }
)

foreach ($c in $containers) {
    if (Test-DockerContainerRunning -Name $c.Name) {
        Write-CheckResult -Name $c.Label -Status "PASS" -Detail ("container " + $c.Name + " running")
    }
    else {
        Write-CheckResult -Name $c.Label -Status "FAIL" -Detail ("container " + $c.Name + " not running")
    }
}

try {
    $pair = $EsUser + ":" + $EsPass
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
    $b64 = [System.Convert]::ToBase64String($bytes)
    $headers = @{ Authorization = "Basic $b64" }
    $docIndex = Invoke-RestMethod -Uri ($EsHost + "/kb_document") -Headers $headers -TimeoutSec 8
    $chunkIndex = Invoke-RestMethod -Uri ($EsHost + "/kb_chunk") -Headers $headers -TimeoutSec 8
    if ($docIndex.kb_document) {
        Write-CheckResult -Name "ES index kb_document" -Status "PASS"
    }
    else {
        Write-CheckResult -Name "ES index kb_document" -Status "WARN" -Detail "missing, run rebuild-es-indices.ps1"
    }
    if ($chunkIndex.kb_chunk) {
        Write-CheckResult -Name "ES index kb_chunk" -Status "PASS"
    }
    else {
        Write-CheckResult -Name "ES index kb_chunk" -Status "WARN" -Detail "missing, run rebuild-es-indices.ps1"
    }
}
catch {
    Write-CheckResult -Name "ES dual indices" -Status "FAIL" -Detail $_.Exception.Message
}

try {
    $sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='kb_statistics' AND table_name IN ('stat_role','stat_team');"
    $result = docker exec $MysqlContainer mysql -uroot -p123456 -N -e $sql 2>$null
    if ([int]$result -eq 2) {
        Write-CheckResult -Name "MySQL stat_role/stat_team" -Status "PASS" -Detail "projection tables exist"
    }
    else {
        Write-CheckResult -Name "MySQL stat_role/stat_team" -Status "WARN" -Detail "apply kb_statistics.sql task 43 DDL"
    }
}
catch {
    Write-CheckResult -Name "MySQL stat_role/stat_team" -Status "FAIL" -Detail $_.Exception.Message
}

if (Test-TcpPortOpen -Port $gatewayPort) {
    Write-CheckResult -Name ("Gateway port " + $gatewayPort) -Status "PASS" -Detail $GatewayUrl
}
else {
    Write-CheckResult -Name ("Gateway port " + $gatewayPort) -Status "WARN" -Detail "services down, run start-services.ps1"
}

if (Test-HttpReachable -Url $RustFsUrl -AcceptStatusCodes @(401, 403, 404)) {
    Write-CheckResult -Name "RustFS" -Status "PASS" -Detail ($RustFsUrl + " (403=expected without auth)")
}
else {
    Write-CheckResult -Name "RustFS" -Status "WARN" -Detail "endpoint unreachable"
}

# Neo4j HTTP（宿主机 20474）：探活 + 图谱节点规模
$Neo4jHttp = if ($env:NEO4J_HTTP_URL) { $env:NEO4J_HTTP_URL } else { "http://127.0.0.1:20474" }
$Neo4jUser = if ($env:NEO4J_USER) { $env:NEO4J_USER } else { "neo4j" }
$Neo4jPass = if ($env:NEO4J_PASSWORD) { $env:NEO4J_PASSWORD } else { "susan123" }
try {
    $neoAuth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${Neo4jUser}:${Neo4jPass}"))
    $neoBody = @{ statements = @(
            @{ statement = "MATCH (d:KnowledgeDocument) RETURN count(d) AS docs" }
            @{ statement = "MATCH (e:KnowledgeEntity) RETURN count(e) AS ents" }
        ) } | ConvertTo-Json -Depth 5
    $neoResp = Invoke-RestMethod -Uri ($Neo4jHttp + "/db/neo4j/tx/commit") -Method Post `
        -Headers @{ Authorization = "Basic $neoAuth"; "Content-Type" = "application/json" } `
        -Body $neoBody -TimeoutSec 8
    if ($neoResp.errors -and $neoResp.errors.Count -gt 0) {
        Write-CheckResult -Name "Neo4j graph" -Status "FAIL" -Detail ($neoResp.errors | ConvertTo-Json -Compress)
    }
    else {
        $docs = [int]$neoResp.results[0].data[0].row[0]
        $ents = [int]$neoResp.results[1].data[0].row[0]
        if ($docs -gt 0 -and $ents -gt 0) {
            Write-CheckResult -Name "Neo4j graph" -Status "PASS" -Detail ("KnowledgeDocument=$docs KnowledgeEntity=$ents")
        }
        elseif ($docs -eq 0 -and $ents -eq 0) {
            Write-CheckResult -Name "Neo4j graph" -Status "WARN" -Detail "empty (run rebuild-neo4j-graph.ps1 or UI 生成知识图谱)"
        }
        else {
            Write-CheckResult -Name "Neo4j graph" -Status "WARN" -Detail ("partial docs=$docs ents=$ents")
        }
    }
}
catch {
    Write-CheckResult -Name "Neo4j HTTP" -Status "WARN" -Detail $_.Exception.Message
}

# Qdrant HTTP（宿主机 26333）：集合存在且维度与默认 embedding 一致
$QdrantUrl = if ($env:QDRANT_HTTP_URL) { $env:QDRANT_HTTP_URL } else { "http://127.0.0.1:26333" }
$ExpectedDim = if ($env:RAG_EMBEDDING_DIMENSION) { [int]$env:RAG_EMBEDDING_DIMENSION } else { 1024 }
try {
    $collections = Invoke-RestMethod -Uri ($QdrantUrl + "/collections") -TimeoutSec 5
    $names = @()
    if ($collections.result.collections) {
        $names = @($collections.result.collections | ForEach-Object { $_.name })
    }
    if ($names -contains "kb_chunk") {
        $info = Invoke-RestMethod -Uri ($QdrantUrl + "/collections/kb_chunk") -TimeoutSec 5
        $dim = $info.result.config.params.vectors.size
        $points = $info.result.points_count
        if ($dim -eq $ExpectedDim) {
            Write-CheckResult -Name "Qdrant kb_chunk" -Status "PASS" -Detail ("dim=$dim points=$points")
        }
        else {
            Write-CheckResult -Name "Qdrant kb_chunk dimension" -Status "FAIL" -Detail ("expected=$ExpectedDim actual=$dim")
        }
    }
    else {
        Write-CheckResult -Name "Qdrant kb_chunk" -Status "WARN" -Detail "collection missing (enable rag.qdrant + reindex)"
    }
}
catch {
    Write-CheckResult -Name "Qdrant HTTP" -Status "WARN" -Detail $_.Exception.Message
}

Write-Host ""
Write-Host "--- Summary ---" -ForegroundColor Cyan
Write-Host ("PASS: " + $PassCount + "  WARN: " + $WarnCount + "  FAIL: " + $FailCount)
if ($FailCount -gt 0) {
    Write-Host "Result: FAILED" -ForegroundColor Red
    exit 1
}
if ($WarnCount -gt 0) {
    Write-Host "Result: PARTIAL (middleware OK, start services for full chain)" -ForegroundColor Yellow
    exit 0
}
Write-Host "Result: ALL PASS" -ForegroundColor Green
exit 0
