#Requires -Version 5.1
# [DEPRECATED / 历史阶段门禁] 非日常冒烟入口；日常请用 verify-all.ps1。保留供契约回归偶发使用。
<#
.SYNOPSIS
  验证 Phase 7 ACL 与 Agent 冒烟脚本不会跳过关键断言。
#>

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$authScript = Join-Path $scriptDir "verify-auth-ai.ps1"
$agentScript = Join-Path $scriptDir "verify-agent-smoke.ps1"
$failCount = 0

function Get-ParameterNames {
    param([string]$Path)
    $tokens = $null
    $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errors)
    if ($errors.Count -gt 0) { throw "PowerShell parse failed: $Path" }
    return @($ast.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath })
}

$authParams = Get-ParameterNames -Path $authScript
foreach ($name in @('AclReaderUser', 'AclReaderPassword', 'AclOwnerUser', 'AclOwnerPassword', 'AclIndexWaitSec')) {
    if ($authParams -notcontains $name) {
        Write-Host "[FAIL] verify-auth-ai missing -$name" -ForegroundColor Red
        $failCount++
    }
}

$agentSource = Get-Content -Raw -LiteralPath $agentScript
if ($agentSource -notmatch '\[string\]\$NormalUser\s*=\s*"tester"') {
    Write-Host "[FAIL] Agent normal user default is not tester" -ForegroundColor Red
    $failCount++
}
if ($agentSource -notmatch '\[string\]\$NormalPassword\s*=\s*"admin123"') {
    Write-Host "[FAIL] Agent normal password default is not admin123" -ForegroundColor Red
    $failCount++
}
if ($agentSource -match '账号不存在，跳过') {
    Write-Host "[FAIL] Agent smoke still skips missing normal user" -ForegroundColor Red
    $failCount++
}

if ($failCount -gt 0) {
    Write-Host "Result: CONTRACT FAILED ($failCount issue(s))" -ForegroundColor Red
    exit 1
}

$authOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $authScript `
    -AclReaderUser '__phase7_missing_user__' -AclReaderPassword 'invalid' 2>&1
$authExit = $LASTEXITCODE
if ($authExit -eq 0) {
    Write-Host "[FAIL] ACL login failure returned exit 0" -ForegroundColor Red
    Write-Host ($authOutput | Out-String)
    exit 1
}

Write-Host "[PASS] ACL account failure returns non-zero" -ForegroundColor Green
Write-Host "Result: PHASE7 SMOKE CONTRACTS PASS" -ForegroundColor Green
exit 0
