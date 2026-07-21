#Requires -Version 5.1
<#
.SYNOPSIS
  Gateway API smoke: login + admin-overview (task 48).

.EXAMPLE
  .\verify-api.ps1
  .\verify-api.ps1 -Username admin -Password admin123
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$Username = "admin",
    [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0

# Write one API check line and bump counters
function Write-ApiResult {
    param(
        [string]$Name,
        [ValidateSet("PASS", "FAIL")]
        [string]$Status,
        [string]$Detail = ""
    )
    switch ($Status) {
        "PASS" { $script:PassCount++ ; $color = "Green" }
        "FAIL" { $script:FailCount++ ; $color = "Red" }
    }
    $msg = if ($Detail) { "$Name - $Detail" } else { $Name }
    Write-Host "[$Status] $msg" -ForegroundColor $color
}

Write-Host ""
Write-Host "=== AI-RAG API smoke check ===" -ForegroundColor Cyan
Write-Host ("Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ("Gateway: " + $GatewayUrl)
Write-Host ""

$loginUrl = $GatewayUrl.TrimEnd("/") + "/api/auth/auth/login"
$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json -Compress

try {
    $loginResp = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginBody -ContentType "application/json; charset=utf-8" -TimeoutSec 15
    $token = $null
    if ($loginResp.data) {
        if ($loginResp.data.accessToken) { $token = $loginResp.data.accessToken }
        elseif ($loginResp.data.token) { $token = $loginResp.data.token }
    }
    if ($loginResp.code -eq 200 -and $token) {
        Write-ApiResult -Name "POST /api/auth/auth/login" -Status "PASS" -Detail ("user=" + $Username)
    }
    else {
        $msg = if ($loginResp.message) { $loginResp.message } else { "missing token in response" }
        Write-ApiResult -Name "POST /api/auth/auth/login" -Status "FAIL" -Detail $msg
        Write-Host ""
        Write-Host ("FAIL: " + $FailCount) -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-ApiResult -Name "POST /api/auth/auth/login" -Status "FAIL" -Detail $_.Exception.Message
    Write-Host ""
    Write-Host ("FAIL: " + $FailCount) -ForegroundColor Red
    exit 1
}

$overviewUrl = $GatewayUrl.TrimEnd("/") + "/api/statistics/admin-overview"
$headers = @{ Authorization = "Bearer $token" }

try {
    $overviewResp = Invoke-RestMethod -Uri $overviewUrl -Method Get -Headers $headers -TimeoutSec 15
    if ($overviewResp.code -eq 200 -and $null -ne $overviewResp.data) {
        $roles = $overviewResp.data.totalRoles
        $teams = $overviewResp.data.totalTeams
        Write-ApiResult -Name "GET /api/statistics/admin-overview" -Status "PASS" -Detail ("totalRoles=$roles totalTeams=$teams")
    }
    else {
        $msg = if ($overviewResp.message) { $overviewResp.message } else { "empty data" }
        Write-ApiResult -Name "GET /api/statistics/admin-overview" -Status "FAIL" -Detail $msg
    }
}
catch {
    Write-ApiResult -Name "GET /api/statistics/admin-overview" -Status "FAIL" -Detail $_.Exception.Message
}

Write-Host ""
Write-Host "--- Summary ---" -ForegroundColor Cyan
Write-Host ("PASS: " + $PassCount + "  FAIL: " + $FailCount)
if ($FailCount -gt 0) {
    Write-Host "Result: FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "Result: ALL PASS" -ForegroundColor Green
exit 0
