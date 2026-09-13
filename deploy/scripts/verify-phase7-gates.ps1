#Requires -Version 5.1
<#
.SYNOPSIS
  Phase 7 integration gates: Golden offline, Search ACL, enableAgent checklist.

.EXAMPLE
  .\verify-phase7-gates.ps1
  .\verify-phase7-gates.ps1 -WriteGoldenBaseline
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [switch]$WriteGoldenBaseline,
    [ValidateSet("keyword", "hybrid")]
    [string]$GoldenSearchMode = "keyword",
    [double]$GoldenMinimumHitRate = 40,
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "admin123",
    [string]$AclReaderUser = "tester",
    [string]$AclReaderPassword = "admin123",
    [string]$AclOwnerUser = "editor",
    [string]$AclOwnerPassword = "admin123",
    [string]$NormalUser = "tester",
    [string]$NormalPassword = "admin123"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$goldenOffline = "UNKNOWN"
$goldenOnline = "SKIP"
$searchAcl = "SKIP"
$gatewayUp = $false
$authOverall = "SKIP"
$agentSmoke = "SKIP"

Write-Host ""
Write-Host "=== Phase 7 integration gates ===" -ForegroundColor Cyan
Write-Host ("Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ("Gateway: " + $GatewayUrl)

Write-Host ""
Write-Host "--- Golden offline ---" -ForegroundColor Cyan
& (Join-Path $scriptDir "verify-rag-golden.ps1") -OfflineOnly
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] golden offline validation" -ForegroundColor Red
    exit 1
}
$goldenOffline = "PASS"

Write-Host ""
Write-Host "--- Gateway probe ---" -ForegroundColor Cyan
$loginUrl = $GatewayUrl.TrimEnd('/') + "/api/auth/auth/login"
try {
    $null = Invoke-WebRequest -Uri $loginUrl -Method POST -ContentType "application/json" `
        -Body '{"username":"__probe__","password":"__probe__"}' -UseBasicParsing -TimeoutSec 5
    $gatewayUp = $true
    Write-Host "[OK] gateway reachable" -ForegroundColor Green
}
catch {
    if ($null -ne $_.Exception.Response) {
        $gatewayUp = $true
        Write-Host "[OK] gateway reachable (login rejected)" -ForegroundColor Green
    }
    else {
        Write-Host ("[FAIL] gateway not reachable: " + $_.Exception.Message) -ForegroundColor Red
    }
}

if ($gatewayUp) {
    Write-Host ""
    Write-Host "--- Auth + Search ACL ---" -ForegroundColor Cyan
    Remove-Item Env:SEARCH_ACL_STATUS -ErrorAction SilentlyContinue
    & (Join-Path $scriptDir "verify-auth-ai.ps1") -GatewayUrl $GatewayUrl `
        -Username $AdminUser -Password $AdminPassword `
        -AclReaderUser $AclReaderUser -AclReaderPassword $AclReaderPassword `
        -AclOwnerUser $AclOwnerUser -AclOwnerPassword $AclOwnerPassword
    $authExit = $LASTEXITCODE
    if ($env:SEARCH_ACL_STATUS) {
        $searchAcl = $env:SEARCH_ACL_STATUS
    }
    else {
        $searchAcl = "FAIL"
    }
    if ($authExit -eq 0) {
        $authOverall = "PASS"
    }
    else {
        $authOverall = "FAIL"
    }
}

if ($gatewayUp) {
    Write-Host ""
    Write-Host ("--- Golden online (" + $GoldenSearchMode + ") ---") -ForegroundColor Cyan
    if ($WriteGoldenBaseline) {
        & (Join-Path $scriptDir "verify-rag-golden.ps1") -GatewayUrl $GatewayUrl `
            -Username $AdminUser -Password $AdminPassword -SearchMode $GoldenSearchMode `
            -MinimumHitRate $GoldenMinimumHitRate -WriteBaseline
    }
    else {
        & (Join-Path $scriptDir "verify-rag-golden.ps1") -GatewayUrl $GatewayUrl `
            -Username $AdminUser -Password $AdminPassword -SearchMode $GoldenSearchMode `
            -MinimumHitRate $GoldenMinimumHitRate
    }
    if ($LASTEXITCODE -eq 0) {
        $goldenOnline = "PASS"
    }
    else {
        $goldenOnline = "FAIL"
    }
}

if ($gatewayUp) {
    Write-Host ""
    Write-Host "--- Agent smoke ---" -ForegroundColor Cyan
    & (Join-Path $scriptDir "verify-agent-smoke.ps1") -GatewayUrl $GatewayUrl `
        -AdminUser $AdminUser -AdminPassword $AdminPassword `
        -NormalUser $NormalUser -NormalPassword $NormalPassword `
        -SearchAclStatus $searchAcl
    if ($LASTEXITCODE -eq 0) {
        $agentSmoke = "PASS"
    }
    else {
        $agentSmoke = "FAIL"
    }
}

Write-Host ""
Write-Host "=== enableAgent gate matrix ===" -ForegroundColor Cyan
$rows = @(
    @{ Gate = "56-Ops / 65-71 code"; Status = "DONE (plan)"; Block = $false },
    @{ Gate = "Gateway reachable"; Status = $(if ($gatewayUp) { "PASS" } else { "FAIL" }); Block = (-not $gatewayUp) },
    @{ Gate = "Golden offline set"; Status = $goldenOffline; Block = ($goldenOffline -ne "PASS") },
    @{ Gate = "Golden online baseline"; Status = $goldenOnline; Block = ($goldenOnline -ne "PASS") },
    @{ Gate = "Auth smoke"; Status = $authOverall; Block = ($authOverall -ne "PASS") },
    @{ Gate = "Search ACL"; Status = $searchAcl; Block = ($searchAcl -ne "PASS") },
    @{ Gate = "Agent smoke"; Status = $agentSmoke; Block = ($agentSmoke -ne "PASS") }
)

$canEnableAgent = $true
foreach ($r in $rows) {
    $color = "Green"
    if ($r.Block) {
        $color = "Red"
        $canEnableAgent = $false
    }
    Write-Host ("{0,-28} {1}" -f $r.Gate, $r.Status) -ForegroundColor $color
}

Write-Host ""
Write-Host ("GoldenOffline={0} GoldenOnline={1} SearchACL={2} Auth={3} Agent={4}" -f `
    $goldenOffline, $goldenOnline, $searchAcl, $authOverall, $agentSmoke)
if (-not $canEnableAgent) {
    Write-Host "Result: GATES FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "Result: GATES PASS" -ForegroundColor Green
exit 0
