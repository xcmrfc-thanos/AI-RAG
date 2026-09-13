#Requires -Version 5.1
# [DEPRECATED / 历史阶段门禁] 非日常冒烟入口；日常请用 verify-all.ps1。保留供契约回归偶发使用。
<#
.SYNOPSIS
  验证 Golden 质量阈值在严格模式失败、Advisory 模式仅报告。
#>

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$goldenScript = Join-Path $scriptDir "verify-rag-golden.ps1"
$tokens = $null
$errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($goldenScript, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw "verify-rag-golden.ps1 parse failed" }
$parameterNames = @($ast.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath })
foreach ($name in @('MinimumHitRate', 'Advisory')) {
    if ($parameterNames -notcontains $name) {
        Write-Host "[FAIL] verify-rag-golden missing -$name" -ForegroundColor Red
        exit 1
    }
}

$strictOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $goldenScript -MinimumHitRate 101 2>&1
$strictExit = $LASTEXITCODE
if ($strictExit -eq 0) {
    Write-Host "[FAIL] strict Golden accepted impossible 101% threshold" -ForegroundColor Red
    Write-Host ($strictOutput | Out-String)
    exit 1
}
Write-Host "[PASS] strict Golden rejects unmet threshold" -ForegroundColor Green

$advisoryOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $goldenScript -MinimumHitRate 101 -Advisory 2>&1
$advisoryExit = $LASTEXITCODE
if ($advisoryExit -ne 0) {
    Write-Host "[FAIL] Advisory Golden returned exit $advisoryExit" -ForegroundColor Red
    Write-Host ($advisoryOutput | Out-String)
    exit 1
}
Write-Host "[PASS] Advisory Golden reports without blocking" -ForegroundColor Green

Write-Host "Result: GOLDEN GATE CONTRACT PASS" -ForegroundColor Green
exit 0
