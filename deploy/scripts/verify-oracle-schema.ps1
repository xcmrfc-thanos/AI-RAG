#Requires -Version 5.1
# Oracle schema smoke: try Docker gvenzl/oracle-xe; if image unavailable SKIP (doc gate) exit 0.
# Authoritative DDL remains backend/sql/schema/mysql/.

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$OraSchemaDir = Join-Path $RepoRoot "backend\sql\schema\oracle"
$Container = "kb-oracle-smoke"
$Image = "gvenzl/oracle-xe:21-slim"
$OraPassword = "OracleSmoke_1"
$OraPort = 1522
$Prefix = "[oracle-smoke]"

function Write-Step {
    param([string]$Message)
    Write-Host ($Prefix + " " + $Message) -ForegroundColor Cyan
}

function Write-Skip {
    param([string]$Reason)
    Write-Host ($Prefix + " SKIP: " + $Reason) -ForegroundColor Yellow
    Write-Host ($Prefix + " Doc gate: review backend/sql/schema/oracle/ and DIALECT_CONVERSION.md; re-run when image is available.") -ForegroundColor Yellow
    exit 0
}

function Remove-SmokeContainer {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    docker rm -f $Container 2>$null | Out-Null
    $ErrorActionPreference = $prev
}

function Test-Docker {
    try {
        docker version --format "{{.Server.Version}}" | Out-Null
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        return $false
    }
}

if (-not (Test-Path (Join-Path $OraSchemaDir "install_all.sql"))) {
    throw "Missing install_all.sql under $OraSchemaDir"
}

if (-not (Test-Docker)) {
    Write-Skip "Docker unavailable"
}

Write-Step ("pull " + $Image + " (may take long / fail offline)")
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
docker pull $Image 2>&1 | Out-Host
$pullOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prev
if (-not $pullOk) {
    Write-Skip ("docker pull " + $Image + " failed (network/registry/policy)")
}

Write-Step "remove old container"
Remove-SmokeContainer

Write-Step "start container"
docker run -d --name $Container `
    -e ("ORACLE_PASSWORD=" + $OraPassword) `
    -p ($OraPort.ToString() + ":1521") `
    -v ($OraSchemaDir + ":/schema:ro") `
    $Image | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Skip ("failed to start " + $Image)
}

$failed = $false
try {
    Write-Step "wait healthy (up to ~5 min)"
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        $prevErr = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $status = ""
        try {
            $status = docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" $Container 2>$null
        }
        catch {
            $status = "none"
        }
        $ErrorActionPreference = $prevErr
        if ($status -eq "healthy") {
            $ready = $true
            break
        }
        $probe = docker exec $Container bash -c ("echo 'SELECT 1 FROM dual;' | sqlplus -s system/" + $OraPassword + "@//localhost/XEPDB1") 2>$null
        if ($LASTEXITCODE -eq 0 -and ($probe -match "\b1\b")) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 5
    }
    if (-not $ready) {
        throw "Oracle not ready within timeout"
    }

    Write-Step "00_create_users.sql"
    docker exec $Container bash -c ("echo '@/schema/00_create_users.sql' | sqlplus -s system/" + $OraPassword + "@//localhost/XEPDB1")
    if ($LASTEXITCODE -ne 0) { throw "00_create_users.sql failed" }

    Write-Step "install_all.sql"
    docker exec -w /schema $Container bash -c ("echo '@/schema/install_all.sql' | sqlplus -s system/" + $OraPassword + "@//localhost/XEPDB1")
    if ($LASTEXITCODE -ne 0) { throw "install_all.sql failed" }

    Write-Step "assert key tables"
    $checkOut = docker exec -w /schema $Container bash -c ("echo '@/schema/_smoke_key_tables.sql' | sqlplus -s system/" + $OraPassword + "@//localhost/XEPDB1")
    if ($LASTEXITCODE -ne 0) {
        throw ("key table check sqlplus failed: " + $checkOut)
    }
    $digitOnes = ([regex]::Matches([string]$checkOut, "(?:^|\s)1(?:\s|$)")).Count
    if ($digitOnes -lt 6) {
        throw ("expected 6 key tables present, digitOnes=" + $digitOnes + " output=" + $checkOut)
    }

    Write-Host ($Prefix + " PASS") -ForegroundColor Green
}
catch {
    $failed = $true
    Write-Host ($Prefix + " FAIL: " + $_.Exception.Message) -ForegroundColor Red
    Write-Host ($Prefix + " If image/resource issue, treat as doc-gate SKIP; keep DDL human review.") -ForegroundColor Yellow
}
finally {
    Write-Step "remove container"
    Remove-SmokeContainer
}

if ($failed) { exit 1 }
exit 0
