#Requires -Version 5.1
# 方言 JVM 最小冒烟：kb-statistics 可选 IT（PG / Oracle upsert）。
# 无 SMOKE_*_JDBC_URL 时测试 Assumptions 跳过，本脚本仍 exit 0（文档门禁）。
# 不强制常驻 compose；库由调用方自备（可先跑 verify-pg-schema / verify-oracle-schema）。

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Backend = Join-Path $RepoRoot "backend"
$Prefix = "[dialect-jvm-smoke]"

function Write-Step {
    param([string]$Message)
    Write-Host ($Prefix + " " + $Message) -ForegroundColor Cyan
}

function Write-SkipInfo {
    param([string]$EnvName)
    Write-Host ($Prefix + " " + $EnvName + " unset -> IT will SKIP (Assumptions)") -ForegroundColor Yellow
}

Write-Step "JDK check"
if (-not $env:JAVA_HOME) {
    Write-Host ($Prefix + " WARN: JAVA_HOME not set; mvn may fail") -ForegroundColor Yellow
}

$pgUrl = $env:SMOKE_PG_JDBC_URL
$oraUrl = $env:SMOKE_ORACLE_JDBC_URL
if ([string]::IsNullOrWhiteSpace($pgUrl)) {
    Write-SkipInfo "SMOKE_PG_JDBC_URL"
} else {
    Write-Step ("PG JDBC = " + $pgUrl)
}
if ([string]::IsNullOrWhiteSpace($oraUrl)) {
    Write-SkipInfo "SMOKE_ORACLE_JDBC_URL"
} else {
    Write-Step ("Oracle JDBC = " + $oraUrl)
}

Write-Step "mvn -pl kb-statistics PgStatisticsJdbcIT + OracleStatisticsJdbcIT"
Push-Location $Backend
try {
    & mvn -pl kb-statistics -am test `
        "-Dtest=PgStatisticsJdbcIT,OracleStatisticsJdbcIT" `
        "-Dsurefire.failIfNoSpecifiedTests=false" `
        -q
    if ($LASTEXITCODE -ne 0) {
        throw "mvn test failed exit=$LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Write-Host ($Prefix + " PASS (executed or skipped by Assumptions)") -ForegroundColor Green
Write-Host ($Prefix + " Doc: set SMOKE_PG_JDBC_URL / SMOKE_ORACLE_JDBC_URL to actually run upsert smoke.") -ForegroundColor DarkGray
exit 0
