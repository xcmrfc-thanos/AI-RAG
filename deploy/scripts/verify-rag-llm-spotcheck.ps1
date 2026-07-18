#Requires -Version 5.1
<#
.SYNOPSIS
  Real LLM spotcheck: RAG chat citations / fromKnowledgeBase / refuse structure.

.EXAMPLE
  .\verify-rag-llm-spotcheck.ps1 -OfflineOnly
  .\verify-rag-llm-spotcheck.ps1 -WriteJudgementSheet
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080",
    [string]$Username = "admin",
    [string]$Password = "admin123",
    [switch]$OfflineOnly,
    [switch]$WriteJudgementSheet,
    [switch]$Advisory,
    [int]$TimeoutSec = 120
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $deployDir
$setPath = Join-Path $repoRoot "docs\eval\rag-llm-spotcheck-set.json"
$sheetPath = Join-Path $repoRoot "docs\eval\rag-llm-spotcheck-judgement.csv"

Write-Host ""
Write-Host "=== RAG LLM Spotcheck v0 ===" -ForegroundColor Cyan
Write-Host ("Set: " + $setPath)

if (-not (Test-Path $setPath)) {
    Write-Host "[FAIL] spotcheck set missing" -ForegroundColor Red
    exit 1
}

$raw = Get-Content -Path $setPath -Raw -Encoding UTF8
$set = $raw | ConvertFrom-Json
if (-not $set.cases -or @($set.cases).Count -lt 4) {
    Write-Host "[FAIL] need at least 4 cases" -ForegroundColor Red
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
}

Write-Host ("[PASS] offline validate cases={0} schemaVersion={1}" -f @($set.cases).Count, $set.schemaVersion) -ForegroundColor Green

if ($OfflineOnly) {
    Write-Host "Result: LLM SPOTCHECK OFFLINE PASS" -ForegroundColor Green
    exit 0
}

if ($env:AI_DEV_STUB -eq "true" -or $env:AI_DEV_STUB -eq "1") {
    Write-Host "[WARN] AI_DEV_STUB=true: answers may be stub; structural checks are advisory" -ForegroundColor Yellow
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

function Invoke-RagChat {
    param([string]$Token, [string]$Content)
    $bodyObj = @{
        content   = $Content
        enableRag = $true
        stream    = $false
    }
    $body = $bodyObj | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Uri ($GatewayUrl.TrimEnd("/") + "/api/rag/chat") `
        -Method Post -Body $body -ContentType "application/json; charset=utf-8" `
        -TimeoutSec $TimeoutSec -Headers @{ Authorization = ("Bearer " + $Token) }
    return $resp
}

function Test-RefuseText {
    param([string]$Text)
    if (-not $Text) { return $false }
    $needles = @(
        [string]::Concat([char]0x77E5, [char]0x8BC6, [char]0x5E93),
        [string]::Concat([char]0x6CA1, [char]0x6709, [char]0x627E, [char]0x5230),
        [string]::Concat([char]0x672A, [char]0x68C0, [char]0x7D22, [char]0x5230),
        [string]::Concat([char]0x4E0D, [char]0x8DB3, [char]0x4EE5, [char]0x56DE, [char]0x7B54),
        [string]::Concat([char]0x4E0D, [char]0x6E05, [char]0x695A),
        [string]::Concat([char]0x4E0D, [char]0x77E5, [char]0x9053),
        [string]::Concat([char]0x65E0, [char]0x6CD5, [char]0x56DE, [char]0x7B54),
        [string]::Concat([char]0x62B1, [char]0x6B49)
    )
    foreach ($n in $needles) {
        if ($Text.Contains($n)) { return $true }
    }
    if ($Text -match 'cannot answer|not found|no relevant|insufficient') { return $true }
    return $false
}

function ConvertTo-CsvField {
    param([string]$Value)
    if ($null -eq $Value) { return '""' }
    $v = $Value.Replace('"', "'").Replace("`r", " ").Replace("`n", " ")
    return '"' + $v + '"'
}

function Get-CitationDocIds {
    param($Citations)
    $out = New-Object System.Collections.Generic.List[string]
    if (-not $Citations) { return @() }
    foreach ($c in @($Citations)) {
        if ($null -ne $c.documentId) {
            $out.Add([string]$c.documentId) | Out-Null
        }
    }
    return @($out)
}

$token = Get-LoginToken -User $Username -Pass $Password
if (-not $token) {
    Write-Host "[FAIL] login failed" -ForegroundColor Red
    exit 1
}

$pass = 0
$fail = 0
$failSamples = New-Object System.Collections.Generic.List[string]
$sheetRows = New-Object System.Collections.Generic.List[string]
$header = "id,type,query,fromKb,citationDocIds,contentPreview,autoPass,humanCiteOk,humanHallucination,humanRefuseOk,humanVerdict,notes"
$sheetRows.Add($header) | Out-Null

$sw = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($c in $set.cases) {
    $expected = @()
    if ($c.expectedDocIds) { $expected = @($c.expectedDocIds | ForEach-Object { [string]$_ }) }
    $requireCitation = [bool]$c.requireCitation
    $expectFromKb = $null
    if ($null -ne $c.expectFromKb) { $expectFromKb = [bool]$c.expectFromKb }
    $expectRefuse = [bool]$c.expectRefuse
    $forbid = @()
    if ($c.forbidPhrases) { $forbid = @($c.forbidPhrases | ForEach-Object { [string]$_ }) }

    $autoOk = $true
    $reasons = New-Object System.Collections.Generic.List[string]
    $fromKb = $false
    $citeIds = @()
    $preview = ""

    try {
        $resp = Invoke-RagChat -Token $token -Content ([string]$c.query)
        $data = $resp.data
        if (-not $data) {
            $autoOk = $false
            $reasons.Add("empty data") | Out-Null
        }
        else {
            $fromKb = [bool]$data.fromKnowledgeBase
            $content = [string]$data.content
            if ($content.Length -gt 120) {
                $preview = $content.Substring(0, 120)
            }
            else {
                $preview = $content
            }
            $citeIds = Get-CitationDocIds -Citations $data.citations

            if ($null -ne $expectFromKb -and $fromKb -ne $expectFromKb) {
                $autoOk = $false
                $reasons.Add(("fromKb={0} expect={1}" -f $fromKb, $expectFromKb)) | Out-Null
            }

            if ($requireCitation) {
                if ($citeIds.Count -eq 0) {
                    $autoOk = $false
                    $reasons.Add("missing citations") | Out-Null
                }
                elseif ($expected.Count -gt 0) {
                    $hit = $false
                    foreach ($id in $citeIds) {
                        if ($expected -contains $id) { $hit = $true; break }
                    }
                    if (-not $hit) {
                        $autoOk = $false
                        $reasons.Add(("cite=[{0}] not in expected=[{1}]" -f ($citeIds -join ","), ($expected -join ","))) | Out-Null
                    }
                }
            }

            if ($expectRefuse) {
                $refuseOk = (-not $fromKb) -or (Test-RefuseText -Text $content) -or ($citeIds.Count -eq 0)
                if (-not $refuseOk) {
                    $autoOk = $false
                    $reasons.Add("refuse structure weak") | Out-Null
                }
                if ($citeIds.Count -gt 0 -and $expected.Count -eq 0) {
                    $autoOk = $false
                    $reasons.Add(("refuse but cited [{0}]" -f ($citeIds -join ","))) | Out-Null
                }
            }

            foreach ($fp in $forbid) {
                if ($content -and $content.Contains($fp)) {
                    $autoOk = $false
                    $reasons.Add(("forbid phrase: " + $fp)) | Out-Null
                }
            }
        }
    }
    catch {
        $autoOk = $false
        $reasons.Add($_.Exception.Message) | Out-Null
        $preview = ""
    }

    if ($autoOk) {
        $pass++
        Write-Host ("[PASS] {0}" -f $c.id) -ForegroundColor Green
    }
    else {
        $fail++
        $msg = ("id={0} {1}" -f $c.id, ($reasons -join "; "))
        $failSamples.Add($msg) | Out-Null
        Write-Host ("[FAIL] " + $msg) -ForegroundColor Red
    }

    $row = @(
        [string]$c.id
        [string]$c.type
        (ConvertTo-CsvField -Value ([string]$c.query))
        [string]$fromKb
        (ConvertTo-CsvField -Value ($citeIds -join ";"))
        (ConvertTo-CsvField -Value $preview)
        [string]$autoOk
        ""
        ""
        ""
        ""
        ""
    ) -join ","
    $sheetRows.Add($row) | Out-Null
}

$sw.Stop()
Write-Host ("autoPass={0}/{1} elapsed={2}s" -f $pass, ($pass + $fail), [math]::Round($sw.Elapsed.TotalSeconds, 2))

if ($WriteJudgementSheet) {
    $utf8Bom = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllLines($sheetPath, $sheetRows, $utf8Bom)
    Write-Host ("[PASS] judgement sheet: " + $sheetPath) -ForegroundColor Green
    Write-Host "Fill human columns per docs/eval/rag-llm-spotcheck.md" -ForegroundColor DarkGray
}

if ($fail -gt 0) {
    if ($Advisory) {
        Write-Host "Result: LLM SPOTCHECK ADVISORY COMPLETE" -ForegroundColor Yellow
        exit 0
    }
    Write-Host "Result: LLM SPOTCHECK FAILED" -ForegroundColor Red
    exit 1
}

Write-Host "Result: LLM SPOTCHECK STRUCTURAL PASS (human judgement still required)" -ForegroundColor Green
exit 0