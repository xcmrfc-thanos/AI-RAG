#Requires -Version 5.1
# [DEPRECATED / 历史阶段门禁] 非日常冒烟入口；日常请用 verify-all.ps1。保留供契约回归偶发使用。
<#
.SYNOPSIS
  验证 Phase 7 与 verify-all 会传播硬门禁失败。
#>

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$phase7Script = Join-Path $scriptDir "verify-phase7-gates.ps1"
$verifyAllScript = Join-Path $scriptDir "verify-all.ps1"
$phase7Source = Get-Content -Raw -LiteralPath $phase7Script

if ($phase7Source -match 'Result: GATES REPORTED' -or
    $phase7Source -notmatch 'verify-agent-smoke\.ps1' -or
    $phase7Source -notmatch 'Result: GATES FAILED') {
    Write-Host "[FAIL] Phase 7 source is missing strict gate propagation" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Phase 7 source contains strict Auth/ACL/Golden/Agent propagation" -ForegroundColor Green

$phase7Output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $phase7Script `
    -GatewayUrl "http://127.0.0.1:1" 2>&1
$phase7Exit = $LASTEXITCODE
if ($phase7Exit -eq 0) {
    Write-Host "[FAIL] Phase 7 accepted unreachable Gateway" -ForegroundColor Red
    Write-Host ($phase7Output | Out-String)
    exit 1
}
Write-Host "[PASS] unreachable Gateway returns non-zero" -ForegroundColor Green

$verifyAllSource = Get-Content -Raw -LiteralPath $verifyAllScript
if ($verifyAllSource -notmatch 'verify-phase7-gates\.ps1') {
    Write-Host "[FAIL] verify-all does not invoke strict Phase 7 gates" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] verify-all includes strict Phase 7 gates" -ForegroundColor Green

Write-Host "Result: PHASE7 HARD GATE CONTRACT PASS" -ForegroundColor Green
exit 0
