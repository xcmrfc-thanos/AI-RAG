#Requires -Version 5.1
<#
.SYNOPSIS
  P1 只读 MCP Server 冒烟：静态契约 + 可选 Live（Gateway）。

.EXAMPLE
  .\verify-mcp-readonly.ps1
  .\verify-mcp-readonly.ps1 -Live
  .\verify-mcp-readonly.ps1 -Live -EnableProbe
#>
param(
    [switch]$Live,
    [switch]$EnableProbe,
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $deployDir
$base = $GatewayUrl.TrimEnd("/")

function Write-McpResult {
    param(
        [string]$Name,
        [ValidateSet("PASS", "FAIL", "SKIP")]
        [string]$Status,
        [string]$Detail = ""
    )
    switch ($Status) {
        "PASS" { $script:PassCount++; $color = "Green" }
        "FAIL" { $script:FailCount++; $color = "Red" }
        "SKIP" { $color = "DarkYellow" }
    }
    $msg = if ($Detail) { "$Name - $Detail" } else { $Name }
    Write-Host "[$Status] $msg" -ForegroundColor $color
}

function Assert-FileContains {
    param([string]$RelPath, [string]$Pattern, [string]$Name, [switch]$MustNot)
    $full = Join-Path $repoRoot $RelPath
    if (-not (Test-Path $full)) {
        Write-McpResult -Name $Name -Status "FAIL" -Detail "missing $RelPath"
        return
    }
    $text = Get-Content $full -Raw -Encoding UTF8
    $hit = [bool]($text -match $Pattern)
    if ($MustNot) {
        if ($hit) { Write-McpResult -Name $Name -Status "FAIL" -Detail "unexpected match in $RelPath" }
        else { Write-McpResult -Name $Name -Status "PASS" }
    }
    else {
        if ($hit) { Write-McpResult -Name $Name -Status "PASS" }
        else { Write-McpResult -Name $Name -Status "FAIL" -Detail "pattern not found in $RelPath" }
    }
}

Write-Host ""
$mode = if ($Live) { "static + live" } else { "static" }
Write-Host "=== verify-mcp-readonly ($mode) ===" -ForegroundColor Cyan

$required = @(
    "docs/agent/mcp-server-boundary-v1.md",
    "docs/superpowers/specs/2026-07-31-mcp-server-readonly-design.md",
    "docs/superpowers/plans/2026-07-31-mcp-server-readonly.md",
    "backend/kb-mcp/pom.xml",
    "backend/kb-mcp/src/main/java/com/knowledge/base/mcp/McpApplication.java",
    "backend/kb-mcp/src/main/java/com/knowledge/base/mcp/tool/HybridSearchMcpTool.java",
    "backend/kb-mcp/src/main/java/com/knowledge/base/mcp/tool/GetDocumentMcpTool.java",
    "backend/kb-mcp/src/main/java/com/knowledge/base/mcp/service/McpJsonRpcService.java"
)
foreach ($rel in $required) {
    if (Test-Path (Join-Path $repoRoot $rel)) {
        Write-McpResult -Name "file $rel" -Status "PASS"
    }
    else {
        Write-McpResult -Name "file $rel" -Status "FAIL" -Detail "missing"
    }
}

Assert-FileContains -RelPath "backend/kb-mcp/src/main/resources/application.yml" `
    -Pattern "enabled:\s*false" -Name "default mcp.server.enabled=false"
Assert-FileContains -RelPath "backend/nacos/kb-gateway-dev.yaml.template" `
    -Pattern "id:\s*kb-mcp" -Name "gateway route kb-mcp"
Assert-FileContains -RelPath "backend/nacos/kb-gateway-dev.yaml.template" `
    -Pattern "Path=/api/mcp,/api/mcp/\*\*" -Name "gateway path /api/mcp"
Assert-FileContains -RelPath "backend/kb-gateway/src/main/resources/application.yml" `
    -Pattern "/api/mcp" -Name "mcp not in whitelist" -MustNot
Assert-FileContains -RelPath "backend/kb-gateway/src/main/java/com/knowledge/base/gateway/filter/UnifiedResponseFilter.java" `
    -Pattern 'startsWith\("/api/mcp"\)' -Name "UnifiedResponse skip /api/mcp"
Assert-FileContains -RelPath "backend/kb-mcp/src/main/java/com/knowledge/base/mcp/tool/HybridSearchMcpTool.java" `
    -Pattern 'return "hybrid_search"' -Name "tool hybrid_search"
Assert-FileContains -RelPath "backend/kb-mcp/src/main/java/com/knowledge/base/mcp/tool/GetDocumentMcpTool.java" `
    -Pattern 'return "get_document"' -Name "tool get_document"
Assert-FileContains -RelPath "docs/agent/mcp-server-boundary-v1.md" `
    -Pattern "HMAC" -Name "boundary mentions HMAC ban"

Push-Location (Join-Path $repoRoot "backend\kb-mcp")
try {
    mvn -q test 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-McpResult -Name "mvn test kb-mcp" -Status "PASS"
    }
    else {
        Write-McpResult -Name "mvn test kb-mcp" -Status "FAIL" -Detail "exit $LASTEXITCODE"
    }
}
catch {
    Write-McpResult -Name "mvn test kb-mcp" -Status "FAIL" -Detail $_.Exception.Message
}
finally {
    Pop-Location
}

if (-not $Live) {
    Write-Host ""
    Write-Host "PASS=$script:PassCount FAIL=$script:FailCount (static only; use -Live for Gateway)" -ForegroundColor Cyan
    if ($script:FailCount -gt 0) { exit 1 }
    exit 0
}

# --- Live ---
function Invoke-Json {
    param([string]$Method, [string]$Url, [hashtable]$Headers = @{}, [object]$Body = $null)
    $params = @{
        Method      = $Method
        Uri         = $Url
        Headers     = $Headers
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }
    return Invoke-RestMethod @params
}

$token = $null
try {
    $login = Invoke-Json -Method POST -Url "$base/api/auth/auth/login" -Body @{
        username = $AdminUser
        password = $AdminPassword
    }
    $token = $login.data.accessToken
    if (-not $token) { $token = $login.data.token }
    if ($token) { Write-McpResult -Name "login" -Status "PASS" }
    else { Write-McpResult -Name "login" -Status "FAIL" -Detail "no token" }
}
catch {
    Write-McpResult -Name "login" -Status "FAIL" -Detail $_.Exception.Message
}

try {
    Invoke-WebRequest -Method POST -Uri "$base/api/mcp" -Body '{}' -ContentType "application/json" -ErrorAction Stop | Out-Null
    Write-McpResult -Name "no-token 401" -Status "FAIL" -Detail "expected 401"
}
catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 401) { Write-McpResult -Name "no-token 401" -Status "PASS" }
    else { Write-McpResult -Name "no-token 401" -Status "FAIL" -Detail "status=$code" }
}

if ($token) {
    $auth = @{ Authorization = "Bearer $token" }
    try {
        $st = Invoke-Json -Method GET -Url "$base/api/mcp/status" -Headers $auth
        $enabled = $false
        if ($st.data) { $enabled = [bool]$st.data.enabled }
        elseif ($null -ne $st.enabled) { $enabled = [bool]$st.enabled }
        Write-McpResult -Name "GET /api/mcp/status" -Status "PASS" -Detail "enabled=$enabled"
        if (-not $EnableProbe -and $enabled) {
            Write-McpResult -Name "default-off reminder" -Status "SKIP" -Detail "server enabled in env"
        }
        if (-not $EnableProbe -and -not $enabled) {
            try {
                Invoke-Json -Method POST -Url "$base/api/mcp" -Headers $auth -Body @{
                    jsonrpc = "2.0"; id = 1; method = "tools/list"
                }
                Write-McpResult -Name "disabled tools/list 503" -Status "FAIL" -Detail "expected 503"
            }
            catch {
                $code = $_.Exception.Response.StatusCode.value__
                if ($code -eq 503) { Write-McpResult -Name "disabled tools/list 503" -Status "PASS" }
                else { Write-McpResult -Name "disabled tools/list 503" -Status "FAIL" -Detail "status=$code" }
            }
        }
        if ($EnableProbe -and $enabled) {
            $list = Invoke-Json -Method POST -Url "$base/api/mcp" -Headers $auth -Body @{
                jsonrpc = "2.0"; id = 1; method = "tools/list"
            }
            $names = @()
            if ($list.result.tools) {
                $names = @($list.result.tools | ForEach-Object { $_.name })
            }
            if ($names -contains "hybrid_search" -and $names -contains "get_document") {
                Write-McpResult -Name "tools/list whitelist" -Status "PASS"
            }
            else {
                Write-McpResult -Name "tools/list whitelist" -Status "FAIL" -Detail ($names -join ",")
            }
        }
        elseif ($EnableProbe -and -not $enabled) {
            Write-McpResult -Name "EnableProbe" -Status "SKIP" -Detail "mcp.server.enabled still false"
        }
    }
    catch {
        Write-McpResult -Name "GET /api/mcp/status" -Status "FAIL" -Detail $_.Exception.Message
    }
}

Write-Host ""
Write-Host "PASS=$script:PassCount FAIL=$script:FailCount" -ForegroundColor Cyan
if ($script:FailCount -gt 0) { exit 1 }
exit 0
