#Requires -Version 5.1
<#
.SYNOPSIS
  RAG Golden v0：校验题集并（可选）对 Search API 计算 Hit@5 / MRR。

.EXAMPLE
  .\verify-rag-golden.ps1 -OfflineOnly
  .\verify-rag-golden.ps1 -SearchMode keyword -WriteBaseline
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$Username = "admin",
    [string]$Password = "admin123",
    [ValidateSet("keyword", "hybrid")]
    [string]$SearchMode = "keyword",
    [switch]$OfflineOnly,
    [switch]$WriteBaseline,
    [double]$MinimumHitRate = 40,
    [switch]$Advisory
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $deployDir
$setPath = Join-Path $repoRoot "docs\eval\rag-golden-set.json"
$baselinePath = Join-Path $repoRoot "docs\eval\rag-golden-baseline.md"

Write-Host ""
Write-Host "=== RAG Golden v0 ===" -ForegroundColor Cyan
Write-Host ("Set: " + $setPath)

if (-not (Test-Path $setPath)) {
    Write-Host "[FAIL] golden set missing" -ForegroundColor Red
    exit 1
}

$raw = Get-Content -Path $setPath -Raw -Encoding UTF8
$set = $raw | ConvertFrom-Json
if (-not $set.cases -or @($set.cases).Count -lt 10) {
    Write-Host "[FAIL] need at least 10 cases" -ForegroundColor Red
    exit 1
}

$ids = @{}
foreach ($c in $set.cases) {
    if (-not $c.id -or -not $c.query -or -not $c.type) {
        Write-Host "[FAIL] case missing id/query/type" -ForegroundColor Red
        exit 1
    }
    if ($ids.ContainsKey([string]$c.id)) {
        Write-Host ("[FAIL] duplicate case id: " + $c.id) -ForegroundColor Red
        exit 1
    }
    $ids[[string]$c.id] = $true
    $allowed = @("exact_keyword", "natural_language", "no_answer", "similar_interference", "acl_invisible")
    if ($allowed -notcontains [string]$c.type) {
        Write-Host ("[FAIL] bad type: " + $c.type) -ForegroundColor Red
        exit 1
    }
}

Write-Host ("[PASS] offline validate cases={0} schemaVersion={1}" -f @($set.cases).Count, $set.schemaVersion) -ForegroundColor Green

if ($OfflineOnly) {
    Write-Host "Result: GOLDEN OFFLINE PASS" -ForegroundColor Green
    exit 0
}

function Get-LoginToken {
    param([string]$User, [string]$Pass)
    $body = @{ username = $User; password = $Pass } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Uri ($GatewayUrl.TrimEnd("/") + "/api/auth/auth/login") `
        -Method Post -Body $body -ContentType "application/json; charset=utf-8" -TimeoutSec 20
    if ($resp.data.accessToken) { return [string]$resp.data.accessToken }
    if ($resp.data.token) { return [string]$resp.data.token }
    return $null
}

function Invoke-Search {
    param([string]$Token, [string]$Query, [string]$Mode, [int]$Size)
    $bodyObj = @{
        keyword    = $Query
        current    = 1
        size       = $Size
        searchMode = $Mode
        topK       = $Size
    }
    $body = $bodyObj | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Uri ($GatewayUrl.TrimEnd("/") + "/api/search/") `
        -Method Post -Body $body -ContentType "application/json; charset=utf-8" -TimeoutSec 60 `
        -Headers @{ Authorization = ("Bearer " + $Token) }
    return $resp
}

function Get-HitRank {
    param($Records, [string[]]$Expected)
    if (-not $Expected -or $Expected.Count -eq 0) { return -1 }
    $i = 0
    foreach ($r in $Records) {
        $i++
        $id = [string]$r.id
        if ($Expected -contains $id) { return $i }
    }
    return 0
}

function Test-Citation {
    param($Record)
    if (-not $Record) { return $false }
    if ($Record.summary) { return $true }
    if ($Record.chunks -and @($Record.chunks).Count -gt 0) { return $true }
    if ($Record.highlights -and @($Record.highlights).Count -gt 0) { return $true }
    return $false
}

$token = Get-LoginToken -User $Username -Pass $Password
if (-not $token) {
    Write-Host "[FAIL] login failed" -ForegroundColor Red
    exit 1
}

$topK = 5
if ($set.topK) { $topK = [int]$set.topK }
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$hit = 0
$posTotal = 0
$mrrSum = 0.0
$mrrN = 0
$citeOk = 0
$citeN = 0
$negPass = 0
$negTotal = 0
$failSamples = New-Object System.Collections.Generic.List[string]
$total = @($set.cases).Count

foreach ($c in $set.cases) {
    $expected = @()
    if ($c.expectedDocIds) { $expected = @($c.expectedDocIds | ForEach-Object { [string]$_ }) }
    $isNeg = ($c.type -eq "no_answer" -or $c.type -eq "acl_invisible" -or $c.expectEmptyTop)

    try {
        $resp = Invoke-Search -Token $token -Query ([string]$c.query) -Mode $SearchMode -Size $topK
        $records = @()
        if ($resp.data -and $resp.data.records) { $records = @($resp.data.records) }

        if ($isNeg) {
            $negTotal++
            # 负向题必须真正返回空 Top5，禁止用查询长度掩盖无关命中。
            $pass = ($records.Count -eq 0)
            if ($pass) { $negPass++ } else {
                $got = ($records | ForEach-Object { $_.id }) -join ","
                $failSamples.Add(("id={0} neg query={1} got=[{2}]" -f $c.id, $c.query, $got)) | Out-Null
            }
            continue
        }

        $posTotal++
        $rank = Get-HitRank -Records $records -Expected $expected
        $mrrN++
        if ($rank -gt 0) {
            $hit++
            $mrrSum += (1.0 / $rank)
            $citeN++
            if ($records.Count -gt 0 -and (Test-Citation -Record $records[$rank - 1])) { $citeOk++ }
        }
        else {
            $mrrSum += 0
            $got = ($records | ForEach-Object { $_.id }) -join ","
            $failSamples.Add(("id={0} query={1} got=[{2}] expected=[{3}]" -f $c.id, $c.query, $got, ($expected -join ","))) | Out-Null
        }
    }
    catch {
        $failSamples.Add(("id={0} error={1}" -f $c.id, $_.Exception.Message)) | Out-Null
        if ($isNeg) { $negTotal++ } else { $posTotal++; $mrrN++ }
    }
}

$sw.Stop()
$hitRate = if ($posTotal -gt 0) { [math]::Round(100.0 * $hit / $posTotal, 1) } else { 0 }
$mrr = if ($mrrN -gt 0) { [math]::Round($mrrSum / $mrrN, 4) } else { 0 }
$citeRate = if ($citeN -gt 0) { [math]::Round(100.0 * $citeOk / $citeN, 1) } else { 0 }
$elapsed = [math]::Round($sw.Elapsed.TotalSeconds, 2)

Write-Host ("Mode={0} Hit@5={1}/{2} ({3}%) MRR={4} citation={5}% negPass={6}/{7} elapsed={8}s" -f `
    $SearchMode, $hit, $posTotal, $hitRate, $mrr, $citeRate, $negPass, $negTotal, $elapsed)
if ($failSamples.Count -gt 0) {
    Write-Host "Failures:" -ForegroundColor Yellow
    $failSamples | Select-Object -First 10 | ForEach-Object { Write-Host ("  " + $_) -ForegroundColor Yellow }
}

$qualityFailures = @()
if ($posTotal -gt 0 -and $hitRate -lt $MinimumHitRate) {
    $qualityFailures += "Hit@5 $hitRate% below minimum $MinimumHitRate%"
}
if ($negPass -lt $negTotal) {
    $qualityFailures += "negative cases $negPass/$negTotal"
}
$qualityPassed = $qualityFailures.Count -eq 0

if ($WriteBaseline -and $qualityPassed -and (Test-Path $baselinePath)) {
    $failText = if ($failSamples.Count -eq 0) { "none" } else { ($failSamples | Select-Object -First 5) -join "; " }
    $line = "| {0} | {1}% ({2}/{3}) | {4} | {5}% | {6} | {7} |" -f `
        $SearchMode, $hitRate, $hit, $posTotal, $mrr, $citeRate, $elapsed, $failText
    $md = Get-Content -Path $baselinePath -Raw -Encoding UTF8
    $pattern = '\| ' + [regex]::Escape($SearchMode) + ' \| _pending_ \| _pending_ \| _pending_ \| _pending_ \| _pending_ \|'
    if ($md -match $pattern) {
        $md2 = [regex]::Replace($md, $pattern, $line, 1)
        Set-Content -Path $baselinePath -Value $md2 -Encoding UTF8
        Write-Host ("[PASS] baseline updated for mode={0}" -f $SearchMode) -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] baseline pending row not found; print line for manual paste:" -ForegroundColor Yellow
        Write-Host $line
    }
}

if (-not $qualityPassed) {
    foreach ($failure in $qualityFailures) {
        Write-Host ("[FAIL] " + $failure) -ForegroundColor Red
    }
    if ($Advisory) {
        Write-Host "Result: GOLDEN ADVISORY COMPLETE" -ForegroundColor Yellow
        exit 0
    }
    Write-Host "Result: GOLDEN QUALITY FAILED" -ForegroundColor Red
    exit 1
}

Write-Host "Result: GOLDEN PASS" -ForegroundColor Green
exit 0
