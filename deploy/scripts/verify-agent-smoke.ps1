#Requires -Version 5.1
<#
.SYNOPSIS
  Agent 冒烟（任务 71）：管理员草稿→校验→发布→Run；负向 401/403；ACL FAIL 时管理员限定模式。

.EXAMPLE
  .\verify-agent-smoke.ps1
  .\verify-agent-smoke.ps1 -SearchAclStatus FAIL
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPassword = "admin123",
    [string]$NormalUser = "tester",
    [string]$NormalPassword = "admin123",
    [ValidateSet("PASS", "FAIL", "UNKNOWN")]
    [string]$SearchAclStatus = $(if ($env:SEARCH_ACL_STATUS) { $env:SEARCH_ACL_STATUS } else { "FAIL" })
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0
$base = $GatewayUrl.TrimEnd("/")

function Write-AgentResult {
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
        TimeoutSec      = 120
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
        $params.ContentType = "application/json; charset=utf-8"
    }
    try {
        $resp = Invoke-WebRequest @params
        $json = $null
        if ($resp.Content) {
            $json = $resp.Content | ConvertFrom-Json
        }
        return @{ StatusCode = [int]$resp.StatusCode; Json = $json; Error = $null }
    }
    catch {
        $code = 0
        $json = $null
        try {
            if ($_.Exception.Response) {
                $code = [int]$_.Exception.Response.StatusCode.value__
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $text = $reader.ReadToEnd()
                    if ($text) { $json = $text | ConvertFrom-Json }
                }
            }
        } catch { }
        return @{ StatusCode = $code; Json = $json; Error = $_.Exception.Message }
    }
}

function Get-LoginToken {
    param([string]$Username, [string]$Password)
    $r = Invoke-Json -Uri "$base/api/auth/auth/login" -Method POST -Body @{
        username = $Username
        password = $Password
    }
    if ($r.StatusCode -eq 200 -and $r.Json -and $r.Json.data) {
        if ($r.Json.data.accessToken) { return [string]$r.Json.data.accessToken }
        if ($r.Json.data.token) { return [string]$r.Json.data.token }
    }
    return $null
}

Write-Host ""
Write-Host "=== verify-agent-smoke (Search ACL=$SearchAclStatus) ===" -ForegroundColor Cyan
if ($SearchAclStatus -eq "FAIL") {
    Write-Host "[MODE] 管理员限定模式：普通用户 Run 期望 403；不发放普户 view/run" -ForegroundColor DarkYellow
}

# 1) 无 Token → 401
$noAuth = Invoke-Json -Uri "$base/api/agent/workflows?publishedOnly=true" -Method GET
if ($noAuth.StatusCode -eq 401) {
    Write-AgentResult -Name "无 Token GET /api/agent/workflows" -Status "PASS" -Detail "HTTP 401"
} else {
    Write-AgentResult -Name "无 Token GET /api/agent/workflows" -Status "FAIL" -Detail ("HTTP " + $noAuth.StatusCode)
}

# 2) 管理员登录
$adminToken = Get-LoginToken -Username $AdminUser -Password $AdminPassword
if (-not $adminToken) {
    Write-AgentResult -Name "管理员登录" -Status "FAIL" -Detail "无法获取 Token"
    Write-Host ("Pass={0} Fail={1}" -f $script:PassCount, $script:FailCount)
    exit 1
}
Write-AgentResult -Name "管理员登录" -Status "PASS"

$draft = @{
    schemaVersion = 1
    name          = "smoke-agent-qa"
    nodes         = @(
        @{
            id    = "search"
            type  = "tool"
            tool  = "hybrid_search"
            input = @{ query = '${input.query}'; topK = 3 }
        },
        @{
            id    = "answer"
            type  = "llm"
            input = @{ prompt = '问题：${input.query} 资料：${steps.search.output}' }
        }
    )
    edges         = @(@{ from = "search"; to = "answer" })
}
$draftJson = $draft | ConvertTo-Json -Depth 20 -Compress

# 3) 创建草稿
$created = Invoke-Json -Uri "$base/api/agent/workflows" -Method POST -Token $adminToken -Body @{
    name      = "smoke-agent-qa"
    draftJson = $draftJson
}
if ($created.StatusCode -eq 200 -and $created.Json.data.id) {
    $wfId = [long]$created.Json.data.id
    Write-AgentResult -Name "创建草稿" -Status "PASS" -Detail ("id=" + $wfId)
} else {
    Write-AgentResult -Name "创建草稿" -Status "FAIL" -Detail ("HTTP " + $created.StatusCode + " " + $created.Error)
    Write-Host ("Pass={0} Fail={1}" -f $script:PassCount, $script:FailCount)
    exit 1
}

# 4) 非法工作流 → 400
$bad = Invoke-Json -Uri "$base/api/agent/workflows/$wfId/draft" -Method PUT -Token $adminToken -Body @{
    draftJson = '{"schemaVersion":1,"name":"bad","nodes":[{"id":"a","type":"llm","input":{"prompt":"1"}},{"id":"b","type":"llm","input":{"prompt":"2"}}],"edges":[{"from":"a","to":"b"},{"from":"a","to":"b"}]}'
}
$badCode = $bad.StatusCode
$bizBad = if ($bad.Json) { [int]$bad.Json.code } else { 0 }
if ($badCode -eq 400 -or $bizBad -eq 400) {
    Write-AgentResult -Name "非法工作流更新" -Status "PASS" -Detail ("HTTP/biz " + $badCode + "/" + $bizBad)
} else {
    Write-AgentResult -Name "非法工作流更新" -Status "FAIL" -Detail ("HTTP/biz " + $badCode + "/" + $bizBad)
}

# 5) 保存合法草稿 + 校验 + 发布
$save = Invoke-Json -Uri "$base/api/agent/workflows/$wfId/draft" -Method PUT -Token $adminToken -Body @{ draftJson = $draftJson }
$val = Invoke-Json -Uri "$base/api/agent/workflows/$wfId/validate" -Method POST -Token $adminToken
$pub = Invoke-Json -Uri "$base/api/agent/workflows/$wfId/publish" -Method POST -Token $adminToken
if ($save.StatusCode -eq 200 -and $val.StatusCode -eq 200 -and $pub.StatusCode -eq 200 -and $pub.Json.data.workflowVersionId) {
    $verId = [long]$pub.Json.data.workflowVersionId
    Write-AgentResult -Name "校验并发布" -Status "PASS" -Detail ("versionId=" + $verId)
} else {
    Write-AgentResult -Name "校验并发布" -Status "FAIL" -Detail ("save/val/pub=" + $save.StatusCode + "/" + $val.StatusCode + "/" + $pub.StatusCode)
    Write-Host ("Pass={0} Fail={1}" -f $script:PassCount, $script:FailCount)
    exit 1
}

# 6) 管理员 Run
$session = Invoke-Json -Uri "$base/api/agent/sessions" -Method POST -Token $adminToken -Body @{ title = "smoke" }
$run = Invoke-Json -Uri "$base/api/agent/runs" -Method POST -Token $adminToken -Body @{
    workflowVersionId = $verId
    sessionId         = $(if ($session.Json.data.id) { $session.Json.data.id } else { $null })
    input             = @{ query = "Agent smoke test" }
    idempotencyKey    = ("smoke-" + [guid]::NewGuid().ToString("N"))
}
$runOk = $false
if ($run.StatusCode -eq 200 -and $run.Json.data) {
    $st = [string]$run.Json.data.status
    $runId = $run.Json.data.id
    $steps = Invoke-Json -Uri "$base/api/agent/runs/$runId/steps" -Method GET -Token $adminToken
    $stepCount = 0
    if ($steps.Json.data) { $stepCount = @($steps.Json.data).Count }
    if ($st -in @("SUCCEEDED", "FAILED", "TIMED_OUT", "CANCELLED") -and $stepCount -ge 1) {
        $runOk = $true
        Write-AgentResult -Name "管理员 Run + Step" -Status "PASS" -Detail ("status=$st steps=$stepCount")
    } else {
        Write-AgentResult -Name "管理员 Run + Step" -Status "FAIL" -Detail ("status=$st steps=$stepCount")
    }
} else {
    Write-AgentResult -Name "管理员 Run + Step" -Status "FAIL" -Detail ("HTTP " + $run.StatusCode + " " + $run.Error)
}

# 7) 普通用户
$normalToken = Get-LoginToken -Username $NormalUser -Password $NormalPassword
if (-not $normalToken) {
    Write-AgentResult -Name "普通用户登录" -Status "FAIL" -Detail "无法获取 Token user=$NormalUser"
} else {
    if ($SearchAclStatus -eq "FAIL") {
        $edit = Invoke-Json -Uri "$base/api/agent/workflows" -Method POST -Token $normalToken -Body @{
            name = "should-forbid"; draftJson = $draftJson
        }
        $editCode = $edit.StatusCode
        $editBiz = if ($edit.Json) { [int]$edit.Json.code } else { 0 }
        if ($editCode -eq 403 -or $editBiz -eq 403) {
            Write-AgentResult -Name "普通用户编辑(ACL FAIL)" -Status "PASS" -Detail "403"
        } else {
            Write-AgentResult -Name "普通用户编辑(ACL FAIL)" -Status "FAIL" -Detail ("HTTP/biz " + $editCode + "/" + $editBiz)
        }

        $nrun = Invoke-Json -Uri "$base/api/agent/runs" -Method POST -Token $normalToken -Body @{
            workflowVersionId = $verId
            input             = @{ query = "user run" }
        }
        $nCode = $nrun.StatusCode
        $nBiz = if ($nrun.Json) { [int]$nrun.Json.code } else { 0 }
        if ($nCode -eq 403 -or $nBiz -eq 403) {
            Write-AgentResult -Name "普通用户 Run(ACL FAIL)" -Status "PASS" -Detail "403 管理员限定模式"
        } else {
            Write-AgentResult -Name "普通用户 Run(ACL FAIL)" -Status "FAIL" -Detail ("HTTP/biz " + $nCode + "/" + $nBiz + " 期望403")
        }
    } else {
        $nrun = Invoke-Json -Uri "$base/api/agent/runs" -Method POST -Token $normalToken -Body @{
            workflowVersionId = $verId
            input             = @{ query = "user run acl pass" }
        }
        if ($nrun.StatusCode -eq 200 -and $nrun.Json.data.status) {
            Write-AgentResult -Name "普通用户 Run(ACL PASS)" -Status "PASS" -Detail ([string]$nrun.Json.data.status)
        } else {
            Write-AgentResult -Name "普通用户 Run(ACL PASS)" -Status "FAIL" -Detail ("HTTP " + $nrun.StatusCode)
        }
    }
}

Write-Host ""
Write-Host ("Agent smoke summary: Pass={0} Fail={1} mode={2}" -f $script:PassCount, $script:FailCount, $SearchAclStatus)
if ($script:FailCount -gt 0) { exit 1 }
exit 0
