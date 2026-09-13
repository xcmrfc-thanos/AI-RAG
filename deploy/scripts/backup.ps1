#Requires -Version 5.1
<#
.SYNOPSIS
  AI-RAG backup: MySQL full database dump + retention cleanup.
.DESCRIPTION
  - Uses docker exec to call mysqldump (does not depend on host mysql client / port mapping)
  - Output deploy/backups/mysql_YYYYMMDD_HHMMSS.sql.gz (gzip inside container)
  - By default deletes backup files older than 14 days
  - Nacos uses built-in storage; it is recommended to periodically export the configuration package from the console as a supplement
.EXAMPLE
  .\backup.ps1
  .\backup.ps1 -RetentionDays 30
  Scheduled task (weekly 2 AM):
  schtasks /Create /TN "AI-RAG Backup" /SC WEEKLY /D SUN /ST 02:00 /TR "powershell -ExecutionPolicy Bypass -File E:\Projects\SVN\self_d\AI-RAG\deploy\scripts\backup.ps1"
#>
param(
    [string]$BackupDir = "",
    [int]$RetentionDays = 14,
    [string]$MysqlContainer = "kb-mysql",
    [string]$MysqlRootPassword = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployDir = Split-Path -Parent $scriptDir
if (-not $BackupDir) { $BackupDir = Join-Path $deployDir "backups" }

# Read MYSQL_ROOT_PASSWORD from deploy/.env (if not passed explicitly)
if (-not $MysqlRootPassword) {
    $envFile = Join-Path $deployDir ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile -Encoding UTF8 | ForEach-Object {
            if ($_ -match '^\s*MYSQL_ROOT_PASSWORD=(.*)$') {
                $MysqlRootPassword = $matches[1].Trim()
            }
        }
    }
}
if (-not $MysqlRootPassword) { $MysqlRootPassword = "123456" }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile = Join-Path $BackupDir ("mysql_" + $stamp + ".sql.gz")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " AI-RAG backup" -ForegroundColor Cyan
Write-Host (" Target: " + $outFile) -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# mysqldump inside container + gzip, write to /tmp inside the container first, then copy back via docker cp
# (avoid the risk of gzip binary getting corrupted when it flows through the PowerShell text pipeline)
$dumpCmd = "mysqldump -uroot -p`"$MysqlRootPassword`" --all-databases --single-transaction --routines --events | gzip > /tmp/ai-rag-backup.sql.gz"
& docker exec $MysqlContainer sh -c $dumpCmd
if ($LASTEXITCODE -ne 0) { throw "mysqldump failed (exit $LASTEXITCODE)" }
docker cp ("$MysqlContainer" + ":/tmp/ai-rag-backup.sql.gz") $outFile | Out-Null
docker exec $MysqlContainer sh -c "rm -f /tmp/ai-rag-backup.sql.gz" | Out-Null

if (-not (Test-Path $outFile)) { throw "backup file not generated: $outFile" }
$sizeMb = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
Write-Host ("[OK] Backup complete: " + $outFile + " (" + $sizeMb + " MB)") -ForegroundColor Green

# Retention cleanup
$cutoff = (Get-Date).AddDays(-$RetentionDays)
$old = Get-ChildItem $BackupDir -Filter "mysql_*.sql.gz" | Where-Object { $_.LastWriteTime -lt $cutoff }
foreach ($f in $old) {
    Remove-Item $f.FullName -Force
    Write-Host ("[CLEAN] Deleted expired backup: " + $f.Name) -ForegroundColor DarkGray
}
Write-Host ("[OK] Retention policy: last " + $RetentionDays + " days") -ForegroundColor Green
