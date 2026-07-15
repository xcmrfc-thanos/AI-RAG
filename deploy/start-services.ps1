#Requires -Version 5.1
<#
.SYNOPSIS
  Start 4 BC services + gateway. Intelligence default JVM 512m/1g, others 256m/512m.
.PARAMETER Only
  Start one service only: file|core|intelligence|statistics|gateway|all
#>
param(
    [ValidateSet("file", "core", "intelligence", "statistics", "gateway", "all")]
    [string]$Only = "all",
    [string]$JvmXms = "",
    [string]$JvmXmx = "",
    [string]$IntelligenceJvmXms = "",
    [string]$IntelligenceJvmXmx = "",
    [int]$WaitPortSec = 120
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $DeployDir
$BackendDir = Join-Path $RootDir "backend"
$LogDir = Join-Path $DeployDir "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Get-Content (Join-Path $DeployDir ".env") -Encoding UTF8 | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
}

if (-not $JvmXms) { $JvmXms = if ($env:JVM_XMS) { $env:JVM_XMS } else { "256m" } }
if (-not $JvmXmx) { $JvmXmx = if ($env:JVM_XMX) { $env:JVM_XMX } else { "512m" } }
if (-not $IntelligenceJvmXms) {
    $IntelligenceJvmXms = if ($env:JVM_INTELLIGENCE_XMS) { $env:JVM_INTELLIGENCE_XMS } else { "512m" }
}
if (-not $IntelligenceJvmXmx) {
    $IntelligenceJvmXmx = if ($env:JVM_INTELLIGENCE_XMX) { $env:JVM_INTELLIGENCE_XMX } else { "1g" }
}

if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "D:\Users\environments\Java21"
}
if (-not (Test-Path $env:JAVA_HOME)) {
    throw ("JAVA_HOME not found: " + $env:JAVA_HOME)
}

$env:MAVEN_OPTS = "-Xms$JvmXms -Xmx$JvmXmx"
Remove-Item Env:JAVA_TOOL_OPTIONS -ErrorAction SilentlyContinue

$services = @(
    @{ Id = "file";         Name = "kb-file";         Module = "kb-file";                          Pom = "kb-file/pom.xml";                          Port = 8084; Xms = $JvmXms; Xmx = $JvmXmx }
    @{ Id = "core";         Name = "kb-core";         Module = "kb-core/kb-core-app";              Pom = "kb-core/kb-core-app/pom.xml";              Port = 8090; Xms = $JvmXms; Xmx = $JvmXmx }
    @{ Id = "intelligence"; Name = "kb-intelligence"; Module = "kb-intelligence/kb-intelligence-app"; Pom = "kb-intelligence/kb-intelligence-app/pom.xml"; Port = 8091; Xms = $IntelligenceJvmXms; Xmx = $IntelligenceJvmXmx }
    @{ Id = "statistics";   Name = "kb-statistics";   Module = "kb-statistics";                    Pom = "kb-statistics/pom.xml";                    Port = 8085; Xms = $JvmXms; Xmx = $JvmXmx }
    @{ Id = "gateway";      Name = "kb-gateway";      Module = "kb-gateway";                       Pom = "kb-gateway/pom.xml";                       Port = 8080; Xms = $JvmXms; Xmx = $JvmXmx }
)

function Test-PortOpen {
    param([int]$Port)
    try {
        $r = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
        return $r.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

function Wait-Port {
    param([int]$Port, [string]$Label)
    Write-Host ("  Waiting " + $Label + " port " + $Port + " ...") -ForegroundColor DarkGray
    for ($i = 0; $i -lt $WaitPortSec; $i++) {
        if (Test-PortOpen -Port $Port) {
            Write-Host ("  OK " + $Label + " listening on " + $Port) -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    Write-Host ("  WARN " + $Label + " port " + $Port + " timeout, continue") -ForegroundColor Yellow
    return $false
}

function Get-IntelligenceJvmArgs {
    param([string]$Xms, [string]$Xmx)
    return "-Xms$Xms -Xmx$Xmx -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=$LogDir"
}

function Start-KbService {
    param($Svc)
    $logOut = Join-Path $LogDir ($Svc.Name + ".out.log")
    $logErr = Join-Path $LogDir ($Svc.Name + ".err.log")
    if (Test-PortOpen -Port $Svc.Port) {
        Write-Host ("SKIP " + $Svc.Name + " port " + $Svc.Port + " already running") -ForegroundColor DarkYellow
        return
    }
    $jvmArgs = if ($Svc.Id -eq "intelligence") {
        Get-IntelligenceJvmArgs -Xms $Svc.Xms -Xmx $Svc.Xmx
    }
    else {
        "-Xms$($Svc.Xms) -Xmx$($Svc.Xmx)"
    }
    Write-Host ("START " + $Svc.Name + " JVM " + $jvmArgs) -ForegroundColor Cyan
    if ($Svc.Id -eq "intelligence") {
        $llmMode = if ($env:QWEN_API_KEY -or $env:DEEPSEEK_API_KEY) { "real API key" } elseif ($env:AI_DEV_STUB -eq "true") { "AI_DEV_STUB" } else { "no LLM key" }
        Write-Host ("  LLM mode: " + $llmMode) -ForegroundColor DarkGray
    }
    & mvn install -pl $Svc.Module -am "-DskipTests" "-Dmaven.test.skip=true" -q
    if ($LASTEXITCODE -ne 0) { throw ("mvn install failed: " + $Svc.Name) }
    $jvmProperty = '-Dspring-boot.run.jvmArguments="' + $jvmArgs + '"'
    $mvnArgs = @(
        "-f", $Svc.Pom,
        "-DskipTests",
        $jvmProperty,
        "spring-boot:run"
    )
    Start-Process -FilePath "mvn.cmd" `
        -ArgumentList $mvnArgs `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput $logOut `
        -RedirectStandardError $logErr `
        -WindowStyle Hidden | Out-Null
    Wait-Port -Port $Svc.Port -Label $Svc.Name | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Start microservices" -ForegroundColor Cyan
Write-Host (" Default JVM: " + $JvmXms + "/" + $JvmXmx) -ForegroundColor Cyan
Write-Host (" Intelligence JVM: " + $IntelligenceJvmXms + "/" + $IntelligenceJvmXmx) -ForegroundColor Cyan
Write-Host (" Logs: " + $LogDir) -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nBUILD mvn compile + install parent..." -ForegroundColor Yellow
Set-Location $BackendDir
& mvn install -N -DskipTests -q
& mvn compile -pl kb-gateway,kb-core/kb-core-app,kb-intelligence/kb-intelligence-app,kb-file,kb-statistics -am -q
if ($LASTEXITCODE -ne 0) { throw "mvn compile failed" }

foreach ($svc in $services) {
    if ($Only -ne "all" -and $Only -ne $svc.Id) { continue }
    Start-KbService -Svc $svc
}

Write-Host "`nDone. Gateway: http://127.0.0.1:8080" -ForegroundColor Green
