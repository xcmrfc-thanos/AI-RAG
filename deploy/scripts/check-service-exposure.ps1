#Requires -Version 5.1
<#
.SYNOPSIS
  生产暴露面检查记录（任务 56-Ops）：确认仅 Gateway 应对公网开放。

.DESCRIPTION
  本地/堡垒机探测业务端口是否对指定「公网视角」地址可达。
  默认检查本机 127.0.0.1（开发态全开属正常）；生产应用 -PublicHost 指向外网 VIP/负载入口，
  期望仅 Gateway 端口开放，Core/Intelligence/File/Statistics/Agent 不可达。

.EXAMPLE
  .\check-service-exposure.ps1
  .\check-service-exposure.ps1 -PublicHost 203.0.113.10 -ExpectGatewayOnly
#>
param(
    [string]$PublicHost = "127.0.0.1",
    [switch]$ExpectGatewayOnly,
    [int]$GatewayPort = 18080,
    [int[]]$InternalPorts = @(8090, 8091, 8084, 8085, 8092)
)

$ErrorActionPreference = "Continue"
$results = @()

function Test-PortOpen {
    param([string]$HostName, [int]$Port)
    try {
        $ok = (Test-NetConnection -ComputerName $HostName -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
        return [bool]$ok
    }
    catch {
        return $false
    }
}

Write-Host ""
Write-Host "=== Service exposure check (56-Ops) ===" -ForegroundColor Cyan
Write-Host ("Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ("Target host: " + $PublicHost)
Write-Host ("ExpectGatewayOnly: " + [bool]$ExpectGatewayOnly)
Write-Host ""

$gwOpen = Test-PortOpen -HostName $PublicHost -Port $GatewayPort
$results += [pscustomobject]@{ Role = "gateway"; Port = $GatewayPort; Open = $gwOpen }
Write-Host ("Gateway  :{0} open={1}" -f $GatewayPort, $gwOpen)

$internalOpen = @()
foreach ($p in $InternalPorts) {
    $open = Test-PortOpen -HostName $PublicHost -Port $p
    $results += [pscustomobject]@{ Role = "internal"; Port = $p; Open = $open }
    if ($open) { $internalOpen += $p }
    Write-Host ("Internal :{0} open={1}" -f $p, $open)
}

Write-Host ""
Write-Host "--- Verdict ---" -ForegroundColor Cyan
if (-not $ExpectGatewayOnly) {
    Write-Host "[INFO] Dev/local mode: listing only. Use -ExpectGatewayOnly for prod gate." -ForegroundColor DarkGray
    Write-Host "Policy: production must expose Gateway only; Core/Intelligence/File/Statistics/Agent on private network."
    $results | Format-Table -AutoSize | Out-String | Write-Host
    exit 0
}

$fail = $false
if (-not $gwOpen) {
    Write-Host "[FAIL] Gateway port not reachable on public host" -ForegroundColor Red
    $fail = $true
}
else {
    Write-Host "[PASS] Gateway reachable" -ForegroundColor Green
}

if ($internalOpen.Count -gt 0) {
    Write-Host ("[FAIL] Internal ports reachable from public host: " + ($internalOpen -join ", ")) -ForegroundColor Red
    $fail = $true
}
else {
    Write-Host "[PASS] Internal business ports not reachable from public host" -ForegroundColor Green
}

if ($fail) { exit 1 }
Write-Host "Result: EXPOSURE CHECK PASS" -ForegroundColor Green
exit 0
