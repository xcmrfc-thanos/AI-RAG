#Requires -Version 5.1
# [DEPRECATED / 历史阶段门禁] 非日常冒烟入口；日常请用 verify-all.ps1。保留供契约回归偶发使用。
<#
.SYNOPSIS
  验证 ES 重建脚本会等待异步任务并传播失败退出码。
#>

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rebuildScript = Join-Path $scriptDir "rebuild-es-indices.ps1"
$source = Get-Content -Raw -LiteralPath $rebuildScript
$tokens = $null
$errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($rebuildScript, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw "rebuild-es-indices.ps1 parse failed" }
$functions = @($ast.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $true) |
        ForEach-Object { $_.Name })

$failures = @()
if ($functions -notcontains 'Wait-ReindexTask') { $failures += 'missing Wait-ReindexTask' }
if ($source -notmatch '\$script:FailCount') { $failures += 'missing FailCount' }
if ($source -notmatch 'failedDocuments') { $failures += 'missing failedDocuments assertion' }
if ($source -notmatch 'Result: REBUILD FAILED') { $failures += 'missing non-zero failure result' }

if ($failures.Count -gt 0) {
    Write-Host ("[FAIL] " + ($failures -join '; ')) -ForegroundColor Red
    exit 1
}

Write-Host "Result: REBUILD SCRIPT CONTRACT PASS" -ForegroundColor Green
exit 0
