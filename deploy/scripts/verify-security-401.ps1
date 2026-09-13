#Requires -Version 5.1
<#
.SYNOPSIS
  Runtime security re-verification: unprotected routes must return 401 without Token; SkyWalking UI liveness probe (soft).
.EXAMPLE
  .\verify-security-401.ps1
  .\verify-security-401.ps1 -GatewayUrl http://127.0.0.1:18080
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$SkyWalkingUiUrl = "http://127.0.0.1:38080"
)

$ErrorActionPreference = "Stop"
$fail = 0

# No-Token access to protected routes: gateway must reject with 401 (mcp/agent/file/notifications each cover one routing domain)
$paths = @(
    "/api/file/files",
    "/api/document/files",
    "/api/agent/workflows",
    "/api/mcp",
    "/api/notifications"
)

Write-Host ""
Write-Host "=== runtime security: unauthenticated requests expect 401 ===" -ForegroundColor Cyan
foreach ($p in $paths) {
    $code = 0
    try {
        $resp = Invoke-WebRequest -Uri ($GatewayUrl + $p) -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($resp) { $code = [int]$resp.StatusCode }
    }
    catch {
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    }

    if ($code -eq 401) {
        Write-Host ("[OK]   401 " + $p) -ForegroundColor Green
    }
    else {
        Write-Host ("[FAIL] expect 401, got " + $code + " -> " + $p) -ForegroundColor Red
        $fail++
    }
}

# SkyWalking UI liveness probe (optional component, soft check: not started does not count as failure)
Write-Host ""
Write-Host "=== skywalking ui probe (soft) ===" -ForegroundColor Cyan
$sw = 0
try {
    $r = Invoke-WebRequest -Uri $SkyWalkingUiUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($r) { $sw = [int]$r.StatusCode }
}
catch {
    if ($_.Exception.Response) { $sw = [int]$_.Exception.Response.StatusCode }
}

if ($sw -gt 0 -and $sw -lt 500) {
    Write-Host ("[OK]   SkyWalking UI reachable (" + $sw + ")") -ForegroundColor Green
}
else {
    Write-Host "[WARN] SkyWalking UI not started (optional component, run docker compose up -d skywalking-oap skywalking-ui) " -ForegroundColor Yellow
}

if ($fail -gt 0) { exit 1 } else { exit 0 }
