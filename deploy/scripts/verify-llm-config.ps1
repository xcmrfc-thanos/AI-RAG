#Requires -Version 5.1
<#
.SYNOPSIS
  Check LLM configuration for kb-intelligence (task 52).

.EXAMPLE
  .\verify-llm-config.ps1
#>
param(
    [string]$GatewayUrl = "http://127.0.0.1:8080",
    [string]$IntelligenceLog = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployDir = Split-Path -Parent $scriptDir
if (-not $IntelligenceLog) {
    $IntelligenceLog = Join-Path $deployDir "logs\kb-intelligence.out.log"
}

Get-Content (Join-Path $deployDir ".env") -Encoding UTF8 -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
}

Write-Host ""
Write-Host "=== LLM config check (task 52) ===" -ForegroundColor Cyan

$hasQwen = [bool]$env:QWEN_API_KEY
$hasDeepseek = [bool]$env:DEEPSEEK_API_KEY
$devStub = ($env:AI_DEV_STUB -eq "true") -or ($env:AI_DEV_STUB -eq "1")

if ($hasQwen) {
    Write-Host "[PASS] QWEN_API_KEY configured (len=$($env:QWEN_API_KEY.Length))" -ForegroundColor Green
}
elseif ($devStub) {
    Write-Host "[PASS] AI_DEV_STUB=true (local stub mode, no QWEN_API_KEY)" -ForegroundColor Green
}
else {
    Write-Host "[WARN] No QWEN_API_KEY and AI_DEV_STUB not enabled" -ForegroundColor Yellow
}

if ($hasDeepseek) {
    Write-Host "[PASS] DEEPSEEK_API_KEY configured" -ForegroundColor Green
}

try {
    $loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json -Compress
    $loginResp = Invoke-RestMethod -Uri ($GatewayUrl.TrimEnd("/") + "/api/auth/auth/login") `
        -Method Post -Body $loginBody -ContentType "application/json; charset=utf-8" -TimeoutSec 15
    $token = $loginResp.data.accessToken
    if (-not $token) { $token = $loginResp.data.token }
    $headers = @{ Authorization = "Bearer $token" }
    $models = Invoke-RestMethod -Uri ($GatewayUrl.TrimEnd("/") + "/api/ai/models") `
        -Headers $headers -TimeoutSec 15
    $count = 0
    if ($models.data) { $count = @($models.data).Count }
    if ($count -gt 0) {
        Write-Host "[PASS] Gateway /api/ai/models available count=$count" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] /api/ai/models returned empty" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "[WARN] Gateway models API: $($_.Exception.Message)" -ForegroundColor Yellow
}

if (Test-Path $IntelligenceLog) {
    $stubLine = Select-String -Path $IntelligenceLog -Pattern "本地开发 Stub|本地 Stub 模式" -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -Last 1
    $keyLine = Select-String -Path $IntelligenceLog -Pattern "API Key 已配置" -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($stubLine) {
        Write-Host "[INFO] Intelligence log: dev stub active" -ForegroundColor DarkGray
    }
    elseif ($keyLine) {
        Write-Host "[INFO] Intelligence log: real API key registered" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Tip: set QWEN_API_KEY in deploy/.env for production; local use AI_DEV_STUB=true" -ForegroundColor DarkGray
exit 0
