#Requires -Version 5.1
<#
.SYNOPSIS
  Phase 7 integration gates: Golden offline, Search ACL, enableAgent checklist.

.EXAMPLE
  .\verify-phase7-gates.ps1
  .\verify-phase7-gates.ps1 -WriteGoldenBaseline
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080",
    [switch]$WriteGoldenBaseline,
    [ValidateSet("keyword", "hybrid")]
    [string]$GoldenSearchMode = "keyword"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$goldenOffline = "UNKNOWN"
$goldenOnline = "SKIP"
$searchAcl = "SKIP"
$gatewayUp = $false
$authOverall = "SKIP"

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
        Write-Host ("[SKIP] gateway not reachable: " + $_.Exception.Message) -ForegroundColor Yellow
    }
}

if ($gatewayUp) {
    Write-Host ""
    Write-Host "--- Auth + Search ACL ---" -ForegroundColor Cyan
    & (Join-Path $scriptDir "verify-auth-ai.ps1") -GatewayUrl $GatewayUrl
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
        & (Join-Path $scriptDir "verify-rag-golden.ps1") -GatewayUrl $GatewayUrl -SearchMode $GoldenSearchMode -WriteBaseline
    }
    else {
        & (Join-Path $scriptDir "verify-rag-golden.ps1") -GatewayUrl $GatewayUrl -SearchMode $GoldenSearchMode
    }
    if ($LASTEXITCODE -eq 0) {
        $goldenOnline = "PASS"
    }
    else {
        $goldenOnline = "FAIL"
    }
}

Write-Host ""
Write-Host "=== enableAgent gate matrix ===" -ForegroundColor Cyan
$rows = @(
    @{ Gate = "56-Ops / 65-71 code"; Status = "DONE (plan)"; Block = $false },
    @{ Gate = "Golden offline set"; Status = $goldenOffline; Block = ($goldenOffline -ne "PASS") },
    @{ Gate = "Golden online baseline"; Status = $goldenOnline; Block = ($goldenOnline -ne "PASS") },
    @{ Gate = "Auth smoke"; Status = $authOverall; Block = ($authOverall -eq "FAIL") },
    @{ Gate = "Search ACL"; Status = $searchAcl; Block = ($searchAcl -ne "PASS") }
)

$canEnableAgent = $true
foreach ($r in $rows) {
    $color = "Green"
    if ($r.Block) {
        $color = "Yellow"
        $canEnableAgent = $false
    }
    Write-Host ("{0,-28} {1}" -f $r.Gate, $r.Status) -ForegroundColor $color
}

Write-Host ""
if ($canEnableAgent -and $searchAcl -eq "PASS") {
    Write-Host "Recommendation: enableAgent MAY open after ops sign-off." -ForegroundColor Green
}
else {
    Write-Host "Recommendation: keep enableAgent=false until Search ACL=PASS and Golden online PASS." -ForegroundColor Yellow
}

Write-Host ""
Write-Host ("GoldenOffline={0} GoldenOnline={1} SearchACL={2} Auth={3}" -f $goldenOffline, $goldenOnline, $searchAcl, $authOverall)
Write-Host "Result: GATES REPORTED" -ForegroundColor Cyan
exit 0
