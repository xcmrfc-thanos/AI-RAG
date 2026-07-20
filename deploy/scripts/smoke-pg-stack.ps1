#Requires -Version 5.1
# PostgreSQL 最小全栈冒烟：起 PG → 导入 schema → 跑 kb-statistics JDBC IT（upsert + 读回）。
# 依赖：Docker、JDK 21、Maven。不启动完整 Nacos 微服务栈。

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$DeployDir = Join-Path $RepoRoot "deploy"
$ComposeFile = Join-Path $DeployDir "docker-compose.pg.yml"
$BackendDir = Join-Path $RepoRoot "backend"
$Prefix = "[pg-stack]"

$PgPort = if ($env:PG_PORT) { $env:PG_PORT } else { "25432" }
$PgUser = if ($env:PG_USER) { $env:PG_USER } else { "postgres" }
$PgPassword = if ($env:PG_PASSWORD) { $env:PG_PASSWORD } else { "pg_smoke_pass" }
$PgDatabase = if ($env:PG_DATABASE) { $env:PG_DATABASE } else { "postgres" }
$Container = "kb-postgres"

function Write-Step {
    param([string]$Message)
    Write-Host ($Prefix + " " + $Message) -ForegroundColor Cyan
}

function Ensure-Docker {
    docker version --format "{{.Server.Version}}" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker unavailable"
    }
}

function Ensure-Java21 {
    if (-not $env:JAVA_HOME -or -not (Test-Path $env:JAVA_HOME)) {
        $candidate = "D:\Users\environments\Java21"
        if (Test-Path $candidate) {
            $env:JAVA_HOME = $candidate
            $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
        }
    }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $null = & java -version 2>&1
    $ok = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prev
    if (-not $ok) {
        throw "Java not available"
    }
}

Ensure-Docker
Ensure-Java21

if (-not (Test-Path $ComposeFile)) {
    throw "Missing $ComposeFile"
}

Write-Step "compose up postgres"
Push-Location $DeployDir
try {
    docker compose -f docker-compose.pg.yml up -d
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed"
    }
}
finally {
    Pop-Location
}

Write-Step "wait ready"
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
    docker exec $Container pg_isready -U $PgUser -d $PgDatabase | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    throw "PostgreSQL not ready"
}

Write-Step "import schema (00_create_schemas + install_all)"
$env:PGPASSWORD = $PgPassword
docker exec -e PGPASSWORD $Container psql -v ON_ERROR_STOP=1 -U $PgUser -d $PgDatabase -f /schema/00_create_schemas.sql
if ($LASTEXITCODE -ne 0) { throw "00_create_schemas.sql failed" }
docker exec -e PGPASSWORD -w /schema $Container psql -v ON_ERROR_STOP=1 -U $PgUser -d $PgDatabase -f /schema/install_all.sql
if ($LASTEXITCODE -ne 0) { throw "install_all.sql failed" }

$jdbcUrl = "jdbc:postgresql://127.0.0.1:${PgPort}/${PgDatabase}?currentSchema=kb_statistics"
$env:SMOKE_PG_JDBC_URL = $jdbcUrl
$env:SMOKE_PG_USER = $PgUser
$env:SMOKE_PG_PASSWORD = $PgPassword

Write-Step ("mvn PgStatisticsJdbcIT url=" + $jdbcUrl)
Push-Location $BackendDir
try {
    if (-not $env:JAVA_HOME) {
        $env:JAVA_HOME = "D:\Users\environments\Java21"
        $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
    }
    mvn -pl kb-statistics -am test "-Dtest=PgStatisticsJdbcIT" "-Dsurefire.failIfNoSpecifiedTests=false" -q
    if ($LASTEXITCODE -ne 0) {
        throw "PgStatisticsJdbcIT failed exit=$LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Write-Host ($Prefix + " PASS") -ForegroundColor Green
Write-Host ($Prefix + " Tip: leave PG running for manual debug, or: docker compose -f deploy/docker-compose.pg.yml down") -ForegroundColor DarkGray
exit 0
