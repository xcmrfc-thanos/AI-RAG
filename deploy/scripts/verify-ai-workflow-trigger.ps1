#Requires -Version 5.1
<#
.SYNOPSIS
  P2 structured @workflow trigger smoke: static contract + optional live gateway checks.

.EXAMPLE
  .\verify-ai-workflow-trigger.ps1
  .\verify-ai-workflow-trigger.ps1 -Live
  .\verify-ai-workflow-trigger.ps1 -Live -RunSample
#>
param(
    [switch]$Live,
    [switch]$RunSample,
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "admin123",
    [switch]$SkipNpmTest
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $deployDir
$frontendDir = Join-Path $repoRoot "frontend"
$base = $GatewayUrl.TrimEnd("/")

function Write-WfResult {
    param(
        [string]$Name,
        [ValidateSet("PASS", "FAIL", "SKIP")]
        [string]$Status,
        [string]$Detail = ""
    )
    switch ($Status) {
        "PASS" { $script:PassCount++; $color = "Green" }
        "FAIL" { $script:FailCount++; $color = "Red" }
        "SKIP" { $color = "DarkYellow" }
    }
    $msg = if ($Detail) { "$Name - $Detail" } else { $Name }
    Write-Host "[$Status] $msg" -ForegroundColor $color
}

function Assert-FileContains {
    param([string]$RelPath, [string]$Pattern, [string]$Name, [switch]$MustNot)
    $full = Join-Path $repoRoot $RelPath
    if (-not (Test-Path $full)) {
        Write-WfResult -Name $Name -Status "FAIL" -Detail "missing $RelPath"
        return
    }
    $text = Get-Content $full -Raw -Encoding UTF8
    $hit = [bool]($text -match $Pattern)
    if ($MustNot) {
        if ($hit) { Write-WfResult -Name $Name -Status "FAIL" -Detail "unexpected match in $RelPath" }
        else { Write-WfResult -Name $Name -Status "PASS" }
    }
    else {
        if ($hit) { Write-WfResult -Name $Name -Status "PASS" }
        else { Write-WfResult -Name $Name -Status "FAIL" -Detail "pattern not found in $RelPath" }
    }
}

Write-Host ""
$mode = if ($Live) { "static + live" } else { "static" }
Write-Host "=== verify-ai-workflow-trigger ($mode) ===" -ForegroundColor Cyan

$required = @(
    "frontend/src/features/ai-workflow-trigger/selection.ts",
    "frontend/src/features/ai-workflow-trigger/gate.ts",
    "frontend/src/features/ai-workflow-trigger/WorkflowMentionPicker.tsx",
    "frontend/src/features/ai-workflow-trigger/WorkflowRunCard.tsx",
    "frontend/src/features/ai-workflow-trigger/selection.test.ts",
    "frontend/src/features/ai-workflow-trigger/gate.test.ts"
)
foreach ($rel in $required) {
    if (Test-Path (Join-Path $repoRoot $rel)) {
        Write-WfResult -Name "file $rel" -Status "PASS"
    }
    else {
        Write-WfResult -Name "file $rel" -Status "FAIL"
    }
}

Assert-FileContains -RelPath "frontend/src/stores/app.store.ts" `
    -Pattern "enableAiWorkflowTrigger:\s*false" `
    -Name "app.store default enableAiWorkflowTrigger=false"

Assert-FileContains -RelPath "backend/kb-core/kb-core-platform/src/main/java/com/knowledge/base/foundation/service/impl/SettingsServiceImpl.java" `
    -Pattern "enableAiWorkflowTrigger" `
    -Name "Settings maps enableAiWorkflowTrigger"

Assert-FileContains -RelPath "backend/kb-core/kb-core-platform/src/main/java/com/knowledge/base/foundation/service/impl/SettingsServiceImpl.java" `
    -Pattern 'system\.enableAiWorkflowTrigger"[^]]*false' `
    -Name "Settings default false"

Assert-FileContains -RelPath "frontend/src/pages/AIAssistantPage.tsx" `
    -Pattern "WorkflowMentionPicker" `
    -Name "AI assistant wires WorkflowMentionPicker"

Assert-FileContains -RelPath "frontend/src/pages/SearchPage.tsx" `
    -Pattern "ai-workflow-trigger|WorkflowMentionPicker|enableAiWorkflowTrigger" `
    -Name "Search page has no workflow trigger" `
    -MustNot

Assert-FileContains -RelPath "frontend/src/features/ai-workflow-trigger/selection.ts" `
    -Pattern "parseWorkflowCommandFromMessage" `
    -Name "reject message-body JSON parse helper exists"

if (-not $SkipNpmTest) {
    Push-Location $frontendDir
    try {
        & npm test -- src/features/ai-workflow-trigger
        if ($LASTEXITCODE -eq 0) {
            Write-WfResult -Name "vitest ai-workflow-trigger" -Status "PASS"
        }
        else {
            Write-WfResult -Name "vitest ai-workflow-trigger" -Status "FAIL" -Detail "exit $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-WfResult -Name "vitest ai-workflow-trigger" -Status "SKIP" -Detail "-SkipNpmTest"
}

if ($Live) {
    function Invoke-Json {
        param(
            [string]$Uri,
            [string]$Method = "GET",
            [string]$Token = $null,
            [object]$Body = $null
        )
        $headers = @{}
        if ($Token) { $headers["Authorization"] = "Bearer $Token" }
        $params = @{
            Uri             = $Uri
            Method          = $Method
            Headers         = $headers
            TimeoutSec      = 60
            UseBasicParsing = $true
        }
        if ($null -ne $Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
            $params.ContentType = "application/json; charset=utf-8"
        }
        try {
            $resp = Invoke-WebRequest @params
            $json = $null
            if ($resp.Content) { $json = $resp.Content | ConvertFrom-Json }
            return @{ StatusCode = [int]$resp.StatusCode; Json = $json }
        }
        catch {
            $code = 0
            try {
                if ($_.Exception.Response) {
                    $code = [int]$_.Exception.Response.StatusCode.value__
                }
            } catch { }
            return @{ StatusCode = $code; Json = $null; Error = $_.Exception.Message }
        }
    }

    $noAuth = Invoke-Json -Uri "$base/api/agent/workflows?publishedOnly=true"
    if ($noAuth.StatusCode -eq 401) {
        Write-WfResult -Name "Live workflows without token" -Status "PASS" -Detail "401"
    }
    else {
        Write-WfResult -Name "Live workflows without token" -Status "FAIL" -Detail ("HTTP " + $noAuth.StatusCode)
    }

    $login = Invoke-Json -Uri "$base/api/auth/auth/login" -Method POST -Body @{
        username = $AdminUser
        password = $AdminPassword
    }
    $token = $null
    if ($login.StatusCode -eq 200 -and $login.Json -and $login.Json.data) {
        if ($login.Json.data.accessToken) { $token = [string]$login.Json.data.accessToken }
        elseif ($login.Json.data.token) { $token = [string]$login.Json.data.token }
    }
    if (-not $token) {
        Write-WfResult -Name "Live admin login" -Status "FAIL" -Detail "no token"
    }
    else {
        Write-WfResult -Name "Live admin login" -Status "PASS"

        $pub = Invoke-Json -Uri "$base/api/config/public"
        if ($pub.StatusCode -ne 200) {
            $pub = Invoke-Json -Uri "$base/api/config/public" -Token $token
        }
        if ($pub.StatusCode -eq 200) {
            $raw = $null
            $data = $pub.Json.data
            if ($null -eq $data) { $data = $pub.Json }
            if ($data -is [System.Collections.IEnumerable] -and -not ($data -is [string])) {
                foreach ($item in @($data)) {
                    if ($null -ne $item -and $item.configKey -eq "system.enableAiWorkflowTrigger") {
                        $raw = [string]$item.configValue
                        break
                    }
                }
            }
            if ($null -eq $raw -and $data -is [psobject]) {
                $prop = $data.PSObject.Properties["system.enableAiWorkflowTrigger"]
                if ($prop) { $raw = [string]$prop.Value }
            }
            if ($null -eq $raw -or $raw -eq "" -or $raw -eq "false") {
                $detail = if ($null -eq $raw -or $raw -eq "") { "absent=>false" } else { "false" }
                Write-WfResult -Name "Live public config default off" -Status "PASS" -Detail $detail
            }
            else {
                Write-WfResult -Name "Live public config default off" -Status "FAIL" -Detail "value=$raw"
            }
        }
        else {
            Write-WfResult -Name "Live public config" -Status "FAIL" -Detail ("HTTP " + $pub.StatusCode)
        }

        $wf = Invoke-Json -Uri "$base/api/agent/workflows?publishedOnly=true" -Token $token
        if ($wf.StatusCode -eq 200) {
            Write-WfResult -Name "Live published workflows list" -Status "PASS"
        }
        else {
            Write-WfResult -Name "Live published workflows list" -Status "FAIL" -Detail ("HTTP " + $wf.StatusCode)
        }

        if ($RunSample) {
            $draftObj = @{
                schemaVersion = 1
                name          = "p2-live-smoke"
                nodes         = @(
                    @{
                        id    = "answer"
                        type  = "llm"
                        input = @{ prompt = 'Echo: ${input.query}' }
                    }
                )
                edges = @()
            }
            $draftJson = $draftObj | ConvertTo-Json -Depth 10 -Compress
            $created = Invoke-Json -Uri "$base/api/agent/workflows" -Method POST -Token $token -Body @{
                name      = "p2-live-smoke"
                draftJson = $draftJson
            }
            $wfId = $null
            if ($created.StatusCode -eq 200 -and $created.Json -and $created.Json.data) {
                $wfId = $created.Json.data.id
            }
            if (-not $wfId) {
                Write-WfResult -Name "Live sample create workflow" -Status "FAIL" -Detail ("HTTP " + $created.StatusCode)
            }
            else {
                $null = Invoke-Json -Uri "$base/api/agent/workflows/$wfId/draft" -Method PUT -Token $token -Body @{ draftJson = $draftJson }
                $null = Invoke-Json -Uri "$base/api/agent/workflows/$wfId/validate" -Method POST -Token $token
                $published = Invoke-Json -Uri "$base/api/agent/workflows/$wfId/publish" -Method POST -Token $token
                $verId = $null
                if ($published.StatusCode -eq 200 -and $published.Json -and $published.Json.data) {
                    $verId = $published.Json.data.workflowVersionId
                }
                if (-not $verId) {
                    Write-WfResult -Name "Live sample publish" -Status "FAIL" -Detail ("HTTP " + $published.StatusCode)
                }
                else {
                    Write-WfResult -Name "Live sample publish" -Status "PASS" -Detail ("versionId=$verId")
                    $idem = "ai-wf-live-" + [guid]::NewGuid().ToString("N")
                    $run1 = Invoke-Json -Uri "$base/api/agent/runs" -Method POST -Token $token -Body @{
                        workflowVersionId = [int64]$verId
                        input             = @{ query = "P2 live smoke" }
                        idempotencyKey    = $idem
                    }
                    $run2 = Invoke-Json -Uri "$base/api/agent/runs" -Method POST -Token $token -Body @{
                        workflowVersionId = [int64]$verId
                        input             = @{ query = "P2 live smoke" }
                        idempotencyKey    = $idem
                    }
                    $st = $null
                    $id1 = $null
                    $id2 = $null
                    if ($run1.Json -and $run1.Json.data) {
                        $st = [string]$run1.Json.data.status
                        $id1 = $run1.Json.data.id
                    }
                    if ($run2.Json -and $run2.Json.data) {
                        $id2 = $run2.Json.data.id
                    }
                    if ($run1.StatusCode -eq 200 -and $st -in @("SUCCEEDED", "FAILED", "TIMED_OUT", "CANCELLED") -and $id1 -and ($id1 -eq $id2)) {
                        Write-WfResult -Name "Live sample run + idempotency" -Status "PASS" -Detail ("status=$st id=$id1")
                    }
                    else {
                        Write-WfResult -Name "Live sample run + idempotency" -Status "FAIL" -Detail ("HTTP $($run1.StatusCode) status=$st id1=$id1 id2=$id2")
                    }
                }
            }
        }
        else {
            Write-WfResult -Name "Live sample run" -Status "SKIP" -Detail "pass -RunSample with -Live"
        }
    }
}
else {
    Write-WfResult -Name "Live gateway checks" -Status "SKIP" -Detail "pass -Live when services are up"
}

Write-Host ""
Write-Host ("Pass={0} Fail={1}" -f $script:PassCount, $script:FailCount)
if ($script:FailCount -gt 0) {
    exit 1
}
exit 0
