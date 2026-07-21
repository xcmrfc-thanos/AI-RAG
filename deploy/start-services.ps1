#Requires -Version 5.1
<#
.SYNOPSIS
  Start 4 BC services + gateway. Intelligence default JVM 512m/1g, others 256m/512m.
.PARAMETER Only
  Start one service only: file|core|intelligence|statistics|agent|gateway|all
#>
param(
    [ValidateSet("file", "core", "intelligence", "statistics", "agent", "gateway", "all")]
    [string]$Only = "all",
    [string]$JvmXms = "",
    [string]$JvmXmx = "",
    [string]$IntelligenceJvmXms = "",
    [string]$IntelligenceJvmXmx = "",
    [int]$WaitPortSec = 120,
    [switch]$ValidateJavaOnly,
    [switch]$ImportNacos
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

if ($ImportNacos) {
    Write-Host "ImportNacos: running scripts\import-nacos.ps1 ..." -ForegroundColor Cyan
    & (Join-Path $DeployDir "scripts\import-nacos.ps1")
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        throw "import-nacos.ps1 failed with exit $LASTEXITCODE"
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

function Get-JavaMajorVersion {
    param([string]$JavaHome)

    if (-not $JavaHome) { return 0 }
    $javaExe = Join-Path $JavaHome "bin\java.exe"
    if (-not (Test-Path $javaExe)) { return 0 }
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $versionLine = (& $javaExe -version 2>&1 | Select-Object -First 1) -as [string]
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
    }
    if ($versionLine -notmatch 'version\s+"(\d+)(?:\.(\d+))?') { return 0 }
    $major = [int]$matches[1]
    if ($major -eq 1 -and $matches[2]) { return [int]$matches[2] }
    return $major
}

$javaMajor = Get-JavaMajorVersion -JavaHome $env:JAVA_HOME
if ($javaMajor -ne 21) {
    $java21Home = "D:\Users\environments\Java21"
    $fallbackMajor = Get-JavaMajorVersion -JavaHome $java21Home
    if ($fallbackMajor -ne 21) {
        throw ("Java 21 required; current JAVA_HOME=" + $env:JAVA_HOME + " major=" + $javaMajor)
    }
    $env:JAVA_HOME = $java21Home
    $javaMajor = $fallbackMajor
}
$env:PATH = (Join-Path $env:JAVA_HOME "bin") + ";" + $env:PATH
Write-Host ("JAVA_HOME: " + $env:JAVA_HOME) -ForegroundColor DarkGray
Write-Host ("Java major: " + $javaMajor) -ForegroundColor DarkGray

if ($ValidateJavaOnly) {
    Write-Host "Result: JAVA 21 READY" -ForegroundColor Green
    exit 0
}

$env:MAVEN_OPTS = "-Xms$JvmXms -Xmx$JvmXmx"
Remove-Item Env:JAVA_TOOL_OPTIONS -ErrorAction SilentlyContinue

$services = @(
    @{ Id = "file";         Name = "kb-file";         Module = "kb-file";                          Pom = "kb-file/pom.xml";                          Port = 8084; Xms = $JvmXms; Xmx = $JvmXmx }
    @{ Id = "core";         Name = "kb-core";         Module = "kb-core/kb-core-app";              Pom = "kb-core/kb-core-app/pom.xml";              Port = 8090; Xms = $JvmXms; Xmx = $JvmXmx }
    @{ Id = "intelligence"; Name = "kb-intelligence"; Module = "kb-intelligence/kb-intelligence-app"; Pom = "kb-intelligence/kb-intelligence-app/pom.xml"; Port = 8091; Xms = $IntelligenceJvmXms; Xmx = $IntelligenceJvmXmx }
    @{ Id = "statistics";   Name = "kb-statistics";   Module = "kb-statistics";                    Pom = "kb-statistics/pom.xml";                    Port = 8085; Xms = $JvmXms; Xmx = $JvmXmx }
    @{ Id = "agent";        Name = "kb-agent";        Module = "kb-agent";                         Pom = "kb-agent/pom.xml";                         Port = 8092; Xms = $JvmXms; Xmx = $JvmXmx }
    @{ Id = "gateway";      Name = "kb-gateway";      Module = "kb-gateway";                       Pom = "kb-gateway/pom.xml";                       Port = 18080; Xms = $JvmXms; Xmx = $JvmXmx }
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
& mvn compile -pl kb-gateway,kb-core/kb-core-app,kb-intelligence/kb-intelligence-app,kb-file,kb-statistics,kb-agent -am -q
if ($LASTEXITCODE -ne 0) { throw "mvn compile failed" }

foreach ($svc in $services) {
    if ($Only -ne "all" -and $Only -ne $svc.Id) { continue }
    Start-KbService -Svc $svc
}

Write-Host "`nDone. Gateway: http://127.0.0.1:18080" -ForegroundColor Green
