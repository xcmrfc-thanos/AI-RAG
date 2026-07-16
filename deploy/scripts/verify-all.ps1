#Requires -Version 5.1
<#
.SYNOPSIS
  Run integration acceptance suite (integration + api + llm + admin-ui static + build).

.EXAMPLE
  .\verify-all.ps1
  .\verify-all.ps1 -SkipBuild
#>
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$frontendDir = Join-Path $repoRoot "frontend"
$backendDir = Join-Path $repoRoot "backend"

$script:FailCount = 0

# Run one step script and track failures
function Invoke-VerifyStep {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host ""
    Write-Host ("=== " + $Name + " ===") -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        $script:FailCount++
        Write-Host ("[FAIL] " + $Name) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " AI-RAG integration acceptance" -ForegroundColor Cyan
Write-Host (" Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")) -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location $scriptDir

Invoke-VerifyStep "verify-integration.ps1" { .\verify-integration.ps1 }
Invoke-VerifyStep "verify-api.ps1" { .\verify-api.ps1 }
Invoke-VerifyStep "verify-auth-ai.ps1" { .\verify-auth-ai.ps1 }
Invoke-VerifyStep "verify-llm-config.ps1" { .\verify-llm-config.ps1 }
Invoke-VerifyStep "verify-admin-ui.ps1" { .\verify-admin-ui.ps1 }

# 定向后端单测（网关鉴权 / Core 内部签名 / 文档索引模式）
Invoke-VerifyStep "backend targeted unit tests (56/57)" {
    $env:JAVA_HOME = if (Test-Path "D:\Users\environments\Java21") { "D:\Users\environments\Java21" } else { $env:JAVA_HOME }
    if ($env:JAVA_HOME) {
        $env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
    }
    Push-Location $backendDir
    try {
        mvn -pl kb-gateway,kb-core/kb-core-app,kb-core/kb-core-document -am test `
            "-Dtest=AuthGlobalFilterTest,InternalServiceAuthFilterTest,InternalServiceHmacUtilTest,DocumentIndexingTriggerServiceImplTest" `
            "-Dsurefire.failIfNoSpecifiedTests=false"
    }
    finally {
        Pop-Location
    }
}

if (-not $SkipBuild) {
    Invoke-VerifyStep "frontend npm run build" {
        Set-Location $frontendDir
        npm run build
        Set-Location $scriptDir
    }
}
else {
    Write-Host ""
    Write-Host "[SKIP] frontend build (-SkipBuild)" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "--- Final ---" -ForegroundColor Cyan
if ($FailCount -gt 0) {
    Write-Host ("Result: FAILED (" + $FailCount + " step(s))") -ForegroundColor Red
    exit 1
}
Write-Host "Result: ALL PASS" -ForegroundColor Green
exit 0
