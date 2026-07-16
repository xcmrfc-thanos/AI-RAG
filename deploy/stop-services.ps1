#Requires -Version 5.1
<#
.SYNOPSIS
  Stop JVM microservices and optional frontend dev server.

.PARAMETER IncludeFrontend
  Also stop Vite dev server on port 3002.

.PARAMETER IncludeDocker
  Also run docker compose down (keeps volumes).

.EXAMPLE
  .\stop-services.ps1
  .\stop-services.ps1 -IncludeFrontend -IncludeDocker
#>
param(
    [switch]$IncludeFrontend,
    [switch]$IncludeDocker
)

$ErrorActionPreference = "Continue"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$ports = @(8080, 8084, 8090, 8091, 8085, 8092)
if ($IncludeFrontend) {
    $ports += 3002
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Stop services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $procId = $conn.OwningProcess
        if (-not $procId) { continue }
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host ("Stopped port {0} PID {1} ({2})" -f $port, $procId, $proc.ProcessName) -ForegroundColor Green
        }
        catch {
            Write-Host ("WARN port {0} PID {1}: {2}" -f $port, $procId, $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    if (-not $conns) {
        Write-Host ("Port {0} not listening" -f $port) -ForegroundColor DarkGray
    }
}

if ($IncludeDocker) {
    Write-Host ""
    Write-Host "Stopping Docker Compose..." -ForegroundColor Cyan
    Set-Location $DeployDir
    docker compose --env-file .env down
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker Compose stopped (volumes kept)." -ForegroundColor Green
    }
    else {
        Write-Host "Docker Compose down failed." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
