#Requires -Version 5.1
<#
.SYNOPSIS
  鉴权与 AI 安全冒烟（任务 58）：缺 Token/非法 Token/伪造内部头 → HTTP 401；登录后受保护 API 200。

.DESCRIPTION
  校验 HTTP 状态码，不以业务码代替。Search ACL 探测会记录 PASS/FAIL；
  FAIL 时 B0/B1 可继续，但普通用户 Agent 权限不得发放直至补齐。

.EXAMPLE
  .\verify-auth-ai.ps1
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:18080",
    [string]$CoreUrl = "http://127.0.0.1:8090",
    [string]$Username = "admin",
    [string]$Password = "admin123",
    [string]$AclReaderUser = "tester",
    [string]$AclReaderPassword = "admin123",
    [string]$AclOwnerUser = "editor",
    [string]$AclOwnerPassword = "admin123",
    [int]$AclIndexWaitSec = 15,
    [string]$HmacSecret = $(if ($env:KB_INTERNAL_HMAC_SECRET) { $env:KB_INTERNAL_HMAC_SECRET } else { "ai-rag-local-dev-hmac-secret-key!!" })
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0
$script:SearchAclStatus = "FAIL"

# 记录单条用例结果
function Write-AuthResult {
    param(
        [string]$Name,
        [ValidateSet("PASS", "FAIL")]
        [string]$Status,
        [string]$Detail = ""
    )
    switch ($Status) {
        "PASS" { $script:PassCount++ ; $color = "Green" }
        "FAIL" { $script:FailCount++ ; $color = "Red" }
    }
    $msg = if ($Detail) { "$Name - $Detail" } else { $Name }
    Write-Host "[$Status] $msg" -ForegroundColor $color
}

# 发起请求并返回 HTTP 状态码（不抛到外层）
function Get-HttpStatus {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    try {
        $params = @{
            Uri             = $Uri
            Method          = $Method
            Headers         = $Headers
            TimeoutSec      = 15
            UseBasicParsing = $true
        }
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json; charset=utf-8"
        }
        $resp = Invoke-WebRequest @params
        return [int]$resp.StatusCode
    }
    catch {
        $ex = $_.Exception
        if ($ex.Response -and $ex.Response.StatusCode) {
            return [int]$ex.Response.StatusCode.value__
        }
        # PowerShell 7+ / .NET：部分环境用 StatusCode 枚举
        if ($_.ErrorDetails -and $_.Exception.Response) {
            try { return [int]$_.Exception.Response.StatusCode } catch { }
        }
        throw
    }
}

# 计算内部 HMAC（与 InternalServiceHmacUtil 一致）
function Get-InternalHmac {
    param(
        [string]$Secret,
        [string]$Method,
        [string]$Path,
        [string]$Timestamp,
        [string]$Service
    )
    $payload = "$($Method.ToUpper())`n$PATH`n$Timestamp`n$Service"
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
    return ([System.BitConverter]::ToString($hash) -replace "-", "").ToLowerInvariant()
}

Write-Host ""
Write-Host "=== AI-RAG auth / AI security smoke ===" -ForegroundColor Cyan
Write-Host ("Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ("Gateway: " + $GatewayUrl)
Write-Host ""

$base = $GatewayUrl.TrimEnd("/")
$core = $CoreUrl.TrimEnd("/")

# 1) 无 Token 访问 AI → 401
try {
    $status = Get-HttpStatus -Uri "$base/api/ai/chat" -Method "POST" -Body '{"message":"ping"}'
    if ($status -eq 401) {
        Write-AuthResult -Name "no-token POST /api/ai/chat" -Status "PASS" -Detail "HTTP 401"
    }
    else {
        Write-AuthResult -Name "no-token POST /api/ai/chat" -Status "FAIL" -Detail "expected 401 got $status"
    }
}
catch {
    Write-AuthResult -Name "no-token POST /api/ai/chat" -Status "FAIL" -Detail $_.Exception.Message
}

# 2) 非法 Token → 401
try {
    $status = Get-HttpStatus -Uri "$base/api/ai/chat" -Method "POST" `
        -Headers @{ Authorization = "Bearer totally-invalid-token" } `
        -Body '{"message":"ping"}'
    if ($status -eq 401) {
        Write-AuthResult -Name "invalid-token POST /api/ai/chat" -Status "PASS" -Detail "HTTP 401"
    }
    else {
        Write-AuthResult -Name "invalid-token POST /api/ai/chat" -Status "FAIL" -Detail "expected 401 got $status"
    }
}
catch {
    Write-AuthResult -Name "invalid-token POST /api/ai/chat" -Status "FAIL" -Detail $_.Exception.Message
}

# 3) 伪造信任头且无合法 JWT → 401（网关清理头后仍无 Token）
try {
    $status = Get-HttpStatus -Uri "$base/api/document/documents/page?current=1&size=1" -Method "GET" `
        -Headers @{
            "X-User-Id"             = "1"
            "X-Internal-Service"    = "kb-intelligence"
            "X-Internal-Timestamp"  = "1"
            "X-Internal-Signature"  = "forged"
        }
    if ($status -eq 401) {
        Write-AuthResult -Name "forged-trust-headers via gateway" -Status "PASS" -Detail "HTTP 401"
    }
    else {
        Write-AuthResult -Name "forged-trust-headers via gateway" -Status "FAIL" -Detail "expected 401 got $status"
    }
}
catch {
    Write-AuthResult -Name "forged-trust-headers via gateway" -Status "FAIL" -Detail $_.Exception.Message
}

# 4) 登录成功
$token = $null
try {
    $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json -Compress
    $loginResp = Invoke-RestMethod -Uri "$base/api/auth/auth/login" -Method Post `
        -Body $loginBody -ContentType "application/json; charset=utf-8" -TimeoutSec 15
    if ($loginResp.data) {
        if ($loginResp.data.accessToken) { $token = $loginResp.data.accessToken }
        elseif ($loginResp.data.token) { $token = $loginResp.data.token }
    }
    if ($loginResp.code -eq 200 -and $token) {
        Write-AuthResult -Name "POST /api/auth/auth/login" -Status "PASS" -Detail ("user=" + $Username)
    }
    else {
        Write-AuthResult -Name "POST /api/auth/auth/login" -Status "FAIL" -Detail "missing token"
        Write-Host ("FAIL: " + $FailCount) -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-AuthResult -Name "POST /api/auth/auth/login" -Status "FAIL" -Detail $_.Exception.Message
    exit 1
}

# 5) 合法 JWT 受保护 API
try {
    $status = Get-HttpStatus -Uri "$base/api/statistics/admin-overview" -Method "GET" `
        -Headers @{ Authorization = "Bearer $token" }
    if ($status -eq 200) {
        Write-AuthResult -Name "auth GET /api/statistics/admin-overview" -Status "PASS" -Detail "HTTP 200"
    }
    else {
        Write-AuthResult -Name "auth GET /api/statistics/admin-overview" -Status "FAIL" -Detail "expected 200 got $status"
    }
}
catch {
    Write-AuthResult -Name "auth GET /api/statistics/admin-overview" -Status "FAIL" -Detail $_.Exception.Message
}

# 6) Core 直连：错误内部签名 → 401
try {
    $path = "/documents/page"
    $ts = [string][int][double]::Parse(((Get-Date).ToUniversalTime() - [datetime]'1970-01-01').TotalSeconds)
    $badHeaders = @{
        "X-Internal-Service"   = "kb-intelligence"
        "X-Internal-Timestamp" = $ts
        "X-Internal-Signature" = "deadbeef"
    }
    $status = Get-HttpStatus -Uri "$core$path`?current=1&size=1" -Method "GET" -Headers $badHeaders
    if ($status -eq 401) {
        Write-AuthResult -Name "core bad-hmac GET /documents/page" -Status "PASS" -Detail "HTTP 401"
    }
    else {
        Write-AuthResult -Name "core bad-hmac GET /documents/page" -Status "FAIL" -Detail "expected 401 got $status"
    }
}
catch {
    Write-AuthResult -Name "core bad-hmac GET /documents/page" -Status "FAIL" -Detail $_.Exception.Message
}

# 7) Core 直连：合法 HMAC → 200（或业务 200 壳）
try {
    $path = "/documents/page"
    $epoch = [int][double]::Parse(((Get-Date).ToUniversalTime() - [datetime]'1970-01-01').TotalSeconds)
    $ts = [string]$epoch
    $sig = Get-InternalHmac -Secret $HmacSecret -Method "GET" -Path $path -Timestamp $ts -Service "kb-intelligence"
    $okHeaders = @{
        "X-Internal-Service"   = "kb-intelligence"
        "X-Internal-Timestamp" = $ts
        "X-Internal-Signature" = $sig
    }
    $status = Get-HttpStatus -Uri "$core$path`?current=1&size=1&status=1" -Method "GET" -Headers $okHeaders
    if ($status -eq 200) {
        Write-AuthResult -Name "core good-hmac GET /documents/page" -Status "PASS" -Detail "HTTP 200"
    }
    else {
        Write-AuthResult -Name "core good-hmac GET /documents/page" -Status "FAIL" -Detail "expected 200 got $status"
    }
}
catch {
    Write-AuthResult -Name "core good-hmac GET /documents/page" -Status "FAIL" -Detail $_.Exception.Message
}

# 8) Search ACL：无 Token→401；双用户（reader=A / owner=B）私有文档隔离
function Get-LoginToken {
    param([string]$User, [string]$Pass)
    $body = @{ username = $User; password = $Pass } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Uri "$base/api/auth/auth/login" -Method Post `
        -Body $body -ContentType "application/json; charset=utf-8" -TimeoutSec 15
    if ($resp.data.accessToken) { return [string]$resp.data.accessToken }
    if ($resp.data.token) { return [string]$resp.data.token }
    return $null
}

function Invoke-JsonApi {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [string]$Bearer = $null,
        [string]$Body = $null
    )
    $headers = @{}
    if ($Bearer) { $headers.Authorization = "Bearer $Bearer" }
    $params = @{
        Uri             = $Uri
        Method          = $Method
        Headers         = $headers
        TimeoutSec      = 30
        UseBasicParsing = $true
    }
    if ($Body) {
        $params.Body = $Body
        $params.ContentType = "application/json; charset=utf-8"
    }
    try {
        $resp = Invoke-WebRequest @params
        return @{ Status = [int]$resp.StatusCode; Content = $resp.Content }
    }
    catch {
        $ex = $_.Exception
        $status = 0
        $content = ""
        if ($ex.Response) {
            try { $status = [int]$ex.Response.StatusCode.value__ } catch { }
            try {
                $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
                $content = $reader.ReadToEnd()
            } catch { }
        }
        if (-not $content -and $_.ErrorDetails.Message) { $content = $_.ErrorDetails.Message }
        return @{ Status = $status; Content = $content }
    }
}

function Test-SearchResultHit {
    param(
        $SearchJson,
        [string]$DocumentId,
        [string]$Marker
    )
    if (-not $SearchJson -or -not $SearchJson.data -or -not $SearchJson.data.records) { return $false }
    foreach ($record in $SearchJson.data.records) {
        if (("" + $record.id) -eq $DocumentId -or (("" + $record.title) -like "*$Marker*")) { return $true }
    }
    return $false
}

try {
    $marker = "acl-private-" + [guid]::NewGuid().ToString("N").Substring(0, 12)
    $noAuth = Get-HttpStatus -Uri "$base/api/search/search?keyword=$marker&current=1&size=5" -Method "GET"
    $withAuth = Get-HttpStatus -Uri "$base/api/search/search?keyword=$marker&current=1&size=5" -Method "GET" `
        -Headers @{ Authorization = "Bearer $token" }

    if ($noAuth -ne 401 -or $withAuth -ne 200) {
        $script:SearchAclStatus = "FAIL"
        Write-AuthResult -Name "Search ACL probe" -Status "FAIL" -Detail "noAuth=$noAuth withAuth=$withAuth"
    }
    else {
        $tokenA = Get-LoginToken -User $AclReaderUser -Pass $AclReaderPassword
        $tokenB = Get-LoginToken -User $AclOwnerUser -Pass $AclOwnerPassword
        if (-not $tokenA -or -not $tokenB) {
            $script:SearchAclStatus = "FAIL"
            Write-AuthResult -Name "Search ACL users" -Status "FAIL" `
                -Detail "cannot login reader=$AclReaderUser owner=$AclOwnerUser"
        }
        else {
            $createBody = @{
                title        = $marker
                summary      = "Search ACL private probe"
                content      = "# $marker`nprivate-only for editor"
                categoryId   = 6000000000000000011
                status       = 1
                isPublic     = 0
                documentType = 1
            } | ConvertTo-Json -Compress
            $create = Invoke-JsonApi -Uri "$base/api/document/documents" -Method "POST" `
                -Bearer $tokenB -Body $createBody
            $createJson = $null
            try { $createJson = $create.Content | ConvertFrom-Json } catch { }
            $docId = $null
            if ($createJson -and $createJson.data) { $docId = $createJson.data }

            if (-not $docId) {
                $script:SearchAclStatus = "FAIL"
                Write-AuthResult -Name "Search ACL create private doc" -Status "FAIL" `
                    -Detail "owner=$AclOwnerUser response=$($create.Content)"
            }
            else {
                $searchB = $null
                $searchBJson = $null
                $bHit = $false
                for ($waited = 0; $waited -lt $AclIndexWaitSec; $waited++) {
                    $searchB = Invoke-JsonApi -Uri "$base/api/search/search?keyword=$marker&current=1&size=10" `
                        -Method "GET" -Bearer $tokenB
                    try { $searchBJson = $searchB.Content | ConvertFrom-Json } catch { $searchBJson = $null }
                    $bHit = Test-SearchResultHit -SearchJson $searchBJson -DocumentId ("" + $docId) -Marker $marker
                    if ($bHit) { break }
                    Start-Sleep -Seconds 1
                }
                $searchA = Invoke-JsonApi -Uri "$base/api/search/search?keyword=$marker&current=1&size=10" `
                    -Method "GET" -Bearer $tokenA
                $readA = Invoke-JsonApi -Uri "$base/api/document/documents/$docId" -Method "GET" -Bearer $tokenA
                $readB = Invoke-JsonApi -Uri "$base/api/document/documents/$docId" -Method "GET" -Bearer $tokenB

                $searchAJson = $null; $readAJson = $null; $readBJson = $null
                try { $searchAJson = $searchA.Content | ConvertFrom-Json } catch { }
                try { $readAJson = $readA.Content | ConvertFrom-Json } catch { }
                try { $readBJson = $readB.Content | ConvertFrom-Json } catch { }

                $aHit = Test-SearchResultHit -SearchJson $searchAJson -DocumentId ("" + $docId) -Marker $marker
                $aForbidden = ($readAJson -and [int]$readAJson.code -eq 403)
                $bOk = ($readBJson -and [int]$readBJson.code -eq 200)

                if (-not $aHit -and $bHit -and $aForbidden -and $bOk) {
                    $script:SearchAclStatus = "PASS"
                    Write-AuthResult -Name "Search ACL" -Status "PASS" `
                        -Detail "reader=$AclReaderUser cannot see owner=$AclOwnerUser private doc $docId"
                }
                else {
                    $script:SearchAclStatus = "FAIL"
                    Write-AuthResult -Name "Search ACL" -Status "FAIL" `
                        -Detail "aHit=$aHit bHit=$bHit aForbidden=$aForbidden bOk=$bOk docId=$docId waited=${AclIndexWaitSec}s"
                }
            }
        }
    }
}
catch {
    $script:SearchAclStatus = "FAIL"
    Write-AuthResult -Name "Search ACL probe" -Status "FAIL" -Detail $_.Exception.Message
}

Write-Host ""
Write-Host "--- Summary ---" -ForegroundColor Cyan
Write-Host ("PASS: " + $PassCount + "  FAIL: " + $FailCount)
Write-Host ("Search ACL: " + $script:SearchAclStatus)
$env:SEARCH_ACL_STATUS = $script:SearchAclStatus
Write-Host "Policy: Phase 7 closure requires Search ACL PASS."
if ($FailCount -gt 0) {
    Write-Host "Result: FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "Result: AUTH PASS (Search ACL=$($script:SearchAclStatus))" -ForegroundColor Green
exit 0
