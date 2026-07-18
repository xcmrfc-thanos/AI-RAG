#Requires -Version 5.1
<#
.SYNOPSIS
  上传秒传/分片冒烟：登录 → check-hash miss → 可选小文件上传后秒传命中。

.DESCRIPTION
  校验网关路径 GET /api/file/files/upload/check-hash 与 POST /api/file/files/upload。
  默认执行 miss 预检；加 -WithUploadHit 时再上传小文本并验证同 hash 命中。

.EXAMPLE
  .\verify-upload-resume.ps1
  .\verify-upload-resume.ps1 -WithUploadHit
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080",
    [string]$Username = "admin",
    [string]$Password = "admin123",
    [switch]$WithUploadHit
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0

# 记录单条检查结果并累计计数
function Write-UploadResult {
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

# 计算字节数组的 SHA-256 小写十六进制摘要
function Get-Sha256Hex {
    param([byte[]]$Bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha.ComputeHash($Bytes)
        return ([System.BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

# PowerShell 5.1 兼容的 multipart 文件上传（字段名 file）
function Invoke-MultipartFileUpload {
    param(
        [string]$Uri,
        [hashtable]$Headers,
        [string]$FilePath,
        [string]$FieldName = "file"
    )
    Add-Type -AssemblyName System.Net.Http
    $client = New-Object System.Net.Http.HttpClient
    try {
        foreach ($key in $Headers.Keys) {
            $client.DefaultRequestHeaders.TryAddWithoutValidation($key, $Headers[$key]) | Out-Null
        }
        $multipart = New-Object System.Net.Http.MultipartFormDataContent
        $fileStream = [System.IO.File]::OpenRead($FilePath)
        $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
        $fileName = [System.IO.Path]::GetFileName($FilePath)
        $multipart.Add($streamContent, $FieldName, $fileName)
        $response = $client.PostAsync($Uri, $multipart).Result
        $body = $response.Content.ReadAsStringAsync().Result
        if (-not $response.IsSuccessStatusCode) {
            throw "HTTP $([int]$response.StatusCode): $body"
        }
        return ($body | ConvertFrom-Json)
    }
    finally {
        if ($null -ne $streamContent) { $streamContent.Dispose() }
        if ($null -ne $fileStream) { $fileStream.Dispose() }
        if ($null -ne $multipart) { $multipart.Dispose() }
        $client.Dispose()
    }
}

Write-Host ""
Write-Host "=== AI-RAG upload resume / fast-upload smoke ===" -ForegroundColor Cyan
Write-Host ("Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ("Gateway: " + $GatewayUrl)
Write-Host ""

$base = $GatewayUrl.TrimEnd("/")
$loginUrl = "$base/api/auth/auth/login"
$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json -Compress

try {
    $loginResp = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginBody `
        -ContentType "application/json; charset=utf-8" -TimeoutSec 15
    $token = $null
    if ($loginResp.data) {
        if ($loginResp.data.accessToken) { $token = $loginResp.data.accessToken }
        elseif ($loginResp.data.token) { $token = $loginResp.data.token }
    }
    if ($loginResp.code -eq 200 -and $token) {
        Write-UploadResult -Name "POST /api/auth/auth/login" -Status "PASS" -Detail ("user=" + $Username)
    }
    else {
        $msg = if ($loginResp.message) { $loginResp.message } else { "missing token" }
        Write-UploadResult -Name "POST /api/auth/auth/login" -Status "FAIL" -Detail $msg
        Write-Host ""
        Write-Host ("FAIL: " + $FailCount) -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-UploadResult -Name "POST /api/auth/auth/login" -Status "FAIL" -Detail $_.Exception.Message
    Write-Host ""
    Write-Host ("FAIL: " + $FailCount) -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $token" }

# 随机 hash：期望秒传 miss（data 为 null）
$randomHash = -join ((1..64) | ForEach-Object { "{0:x}" -f (Get-Random -Maximum 16) })
$checkUrl = "$base/api/file/files/upload/check-hash?fileHash=$randomHash"

try {
    $missResp = Invoke-RestMethod -Uri $checkUrl -Method Get -Headers $headers -TimeoutSec 15
    if ($missResp.code -eq 200 -and $null -eq $missResp.data) {
        Write-UploadResult -Name "GET check-hash (miss)" -Status "PASS" -Detail ("hash=" + $randomHash.Substring(0, 12) + "...")
    }
    else {
        $detail = "code=$($missResp.code)"
        if ($missResp.message) { $detail = $missResp.message }
        elseif ($null -ne $missResp.data) { $detail = "expected null data, got id=$($missResp.data.id)" }
        Write-UploadResult -Name "GET check-hash (miss)" -Status "FAIL" -Detail $detail
    }
}
catch {
    Write-UploadResult -Name "GET check-hash (miss)" -Status "FAIL" -Detail $_.Exception.Message
}

if ($WithUploadHit) {
    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $content = "upload-resume-smoke-$stamp"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $fileHash = Get-Sha256Hex -Bytes $bytes
    $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("kb-upload-smoke-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
    $tmpFile = Join-Path $tmpDir "smoke-$stamp.txt"
    [System.IO.File]::WriteAllBytes($tmpFile, $bytes)

    try {
        $uploadUrl = "$base/api/file/files/upload"
        $uploadResp = Invoke-MultipartFileUpload -Uri $uploadUrl -Headers $headers -FilePath $tmpFile
        if ($uploadResp.code -eq 200 -and $uploadResp.data -and $uploadResp.data.id) {
            Write-UploadResult -Name "POST /api/file/files/upload" -Status "PASS" `
                -Detail ("id=" + $uploadResp.data.id + " size=" + $bytes.Length)
        }
        else {
            $msg = if ($uploadResp.message) { $uploadResp.message } else { "empty data" }
            Write-UploadResult -Name "POST /api/file/files/upload" -Status "FAIL" -Detail $msg
        }

        $hitUrl = "$base/api/file/files/upload/check-hash?fileHash=$fileHash"
        $hitResp = Invoke-RestMethod -Uri $hitUrl -Method Get -Headers $headers -TimeoutSec 15
        if ($hitResp.code -eq 200 -and $null -ne $hitResp.data -and $hitResp.data.id) {
            Write-UploadResult -Name "GET check-hash (hit)" -Status "PASS" `
                -Detail ("id=" + $hitResp.data.id + " hash=" + $fileHash.Substring(0, 12) + "...")
        }
        else {
            $msg = if ($hitResp.message) { $hitResp.message } else { "expected hit, data null" }
            Write-UploadResult -Name "GET check-hash (hit)" -Status "FAIL" -Detail $msg
        }
    }
    catch {
        Write-UploadResult -Name "upload + check-hash hit" -Status "FAIL" -Detail $_.Exception.Message
    }
    finally {
        Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host "[SKIP] upload + check-hash hit (pass -WithUploadHit to enable)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "--- Summary ---" -ForegroundColor Cyan
Write-Host ("PASS: " + $PassCount + "  FAIL: " + $FailCount)
if ($FailCount -gt 0) {
    Write-Host "Result: FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "Result: ALL PASS" -ForegroundColor Green
exit 0
