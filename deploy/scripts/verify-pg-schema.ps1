#Requires -Version 5.1
# 用临时 Docker PostgreSQL 冒烟验证 schema/postgresql 翻译稿。
# 依赖 Docker；权威 DDL 仍为 backend/sql/schema/mysql/。

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$PgSchemaDir = Join-Path $RepoRoot "backend\sql\schema\postgresql"
$Container = "kb-pg-smoke"
$Image = "postgres:16-alpine"
$PgUser = "postgres"
$PgPassword = "smoke_pg_pass"
$PgDb = "postgres"

function Write-Step {
    param([string]$Message)
    Write-Host "[pg-smoke] $Message" -ForegroundColor Cyan
}

function Ensure-Docker {
    docker version --format "{{.Server.Version}}" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker unavailable"
    }
}

function Remove-SmokeContainer {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    docker rm -f $Container 2>$null | Out-Null
    $ErrorActionPreference = $prev
}

function Invoke-PsqlFile {
    param([string]$RelativePath)
    Write-Step "psql -f $RelativePath"
    $env:PGPASSWORD = $PgPassword
    docker exec -e PGPASSWORD $Container psql -v ON_ERROR_STOP=1 -U $PgUser -d $PgDb -f "/schema/$RelativePath"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed: $RelativePath exit=$LASTEXITCODE"
    }
}

Ensure-Docker
$installAll = Join-Path $PgSchemaDir "install_all.sql"
if (-not (Test-Path $installAll)) {
    throw "Missing $installAll"
}

Write-Step "remove old container"
Remove-SmokeContainer

Write-Step "start $Image"
docker run -d --name $Container -e "POSTGRES_PASSWORD=$PgPassword" -v "${PgSchemaDir}:/schema:ro" $Image | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to start postgres container"
}

$failed = $false
try {
    Write-Step "wait ready"
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        docker exec -e "POSTGRES_PASSWORD=$PgPassword" $Container pg_isready -U $PgUser -d $PgDb | Out-Null
        # pg_isready does not need password
        docker exec $Container pg_isready -U $PgUser -d $PgDb | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw "PostgreSQL not ready"
    }

    Invoke-PsqlFile "00_create_schemas.sql"

    Write-Step "install_all.sql"
    docker exec -e "PGPASSWORD=$PgPassword" -w /schema $Container psql -v ON_ERROR_STOP=1 -U $PgUser -d $PgDb -f /schema/install_all.sql
    if ($LASTEXITCODE -ne 0) {
        throw "install_all.sql failed exit=$LASTEXITCODE"
    }

    Write-Step "count tables"
    $countSql = 'SELECT n.nspname, COUNT(c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = ''r'' AND n.nspname LIKE ''kb_%'' GROUP BY n.nspname ORDER BY n.nspname;'
    $stats = docker exec -e "PGPASSWORD=$PgPassword" $Container psql -U $PgUser -d $PgDb -At -F '|' -c $countSql
    if ($LASTEXITCODE -ne 0) {
        throw "count tables failed"
    }
    Write-Host $stats

    $lines = @($stats | Where-Object { $_ -and $_.ToString().Trim() -ne "" })
    if ($lines.Count -lt 5) {
        throw "expected >=5 kb_* schemas with tables, got $($lines.Count)"
    }
    foreach ($line in $lines) {
        $parts = $line.ToString() -split '\|'
        if ($parts.Count -ge 2) {
            $cnt = 0
            if (-not [int]::TryParse($parts[1], [ref]$cnt)) {
                throw "bad count line: $line"
            }
            if ($cnt -le 0) {
                throw "schema $($parts[0]) has 0 tables"
            }
        }
    }

    Write-Step "assert key tables"
    $keyTables = @(
        "kb_user.kb_user",
        "kb_document.kb_document",
        "kb_file.kb_file",
        "kb_statistics.stat_document",
        "kb_intelligence.kb_search_history",
        "kb_agent.agent_session"
    )
    foreach ($fqn in $keyTables) {
        $parts = $fqn -split '\.'
        $schema = $parts[0]
        $table = $parts[1]
        $existsSql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$schema' AND table_name = '$table';"
        $exists = docker exec -e "PGPASSWORD=$PgPassword" $Container psql -U $PgUser -d $PgDb -At -c $existsSql
        if ($LASTEXITCODE -ne 0 -or $exists.ToString().Trim() -ne "1") {
            throw "missing key table: $fqn (got '$exists')"
        }
    }
    Write-Host "key tables OK: $($keyTables -join ', ')"

    Write-Host "[pg-smoke] PASS" -ForegroundColor Green
}
catch {
    $failed = $true
    Write-Host "[pg-smoke] FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Write-Step "remove container"
    Remove-SmokeContainer
}

if ($failed) { exit 1 }
exit 0
