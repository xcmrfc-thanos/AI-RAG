#Requires -Version 5.1
# [DEPRECATED / 历史阶段门禁] 非日常冒烟入口；日常请用 verify-all.ps1。保留供契约回归偶发使用。
<#
.SYNOPSIS
  验证服务启动脚本会将 Java 运行时收口到 Java 21。
#>

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScript = Join-Path (Split-Path -Parent $scriptDir) "start-services.ps1"
$java8Home = "D:\Users\environments\Java"
$java21Home = "D:\Users\environments\Java21"
$originalJavaHome = $env:JAVA_HOME
$originalPath = $env:PATH
$failCount = 0

$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    $startScript,
    [ref]$tokens,
    [ref]$parseErrors
)
$parameterNames = @($ast.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath })
if ($parameterNames -notcontains "ValidateJavaOnly") {
    Write-Host "[FAIL] start-services.ps1 missing -ValidateJavaOnly" -ForegroundColor Red
    exit 1
}

function Invoke-JavaRuntimeCase {
    param(
        [string]$Name,
        [string]$JavaHome,
        [bool]$ExpectFallback
    )

    $env:JAVA_HOME = $JavaHome
    $env:PATH = (Join-Path $JavaHome "bin") + ";" + $originalPath
    $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript -ValidateJavaOnly 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String)
    $hasMajor = $text -match "Java major:\s*21"
    $hasExpectedHome = $text -match [regex]::Escape($java21Home)

    if ($exitCode -eq 0 -and $hasMajor -and $hasExpectedHome) {
        $mode = if ($ExpectFallback) { "fallback" } else { "direct" }
        Write-Host "[PASS] $Name - Java21 $mode" -ForegroundColor Green
        return
    }

    $script:failCount++
    Write-Host "[FAIL] $Name - exit=$exitCode" -ForegroundColor Red
    Write-Host $text
}

try {
    Invoke-JavaRuntimeCase -Name "Java8 environment" -JavaHome $java8Home -ExpectFallback $true
    Invoke-JavaRuntimeCase -Name "Java21 environment" -JavaHome $java21Home -ExpectFallback $false
}
finally {
    $env:JAVA_HOME = $originalJavaHome
    $env:PATH = $originalPath
}

if ($failCount -gt 0) {
    Write-Host "Result: FAILED ($failCount case(s))" -ForegroundColor Red
    exit 1
}

Write-Host "Result: JAVA RUNTIME PASS" -ForegroundColor Green
exit 0
