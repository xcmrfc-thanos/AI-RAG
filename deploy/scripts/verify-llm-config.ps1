#Requires -Version 5.1
<#
.SYNOPSIS
  Check LLM configuration for kb-intelligence (task 52 / 59).

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
Write-Host "=== LLM config check (task 52 / 59) ===" -ForegroundColor Cyan

# Task 59: Nacos template and module fallback must use default-model qwen
$repoRoot = Split-Path -Parent $deployDir
$nacosTpl = Join-Path $repoRoot "backend\nacos\kb-intelligence-dev.yaml.template"
$modYml = Join-Path $repoRoot "backend\kb-intelligence\kb-intelligence-llm\src\main\resources\application.yml"
$script:FailCount = 0

function Assert-DefaultModelQwen {
    param(
        [string]$Path,
        [string]$Label
    )
    if (-not (Test-Path $Path)) {
        Write-Host ("[FAIL] missing {0}: {1}" -f $Label, $Path) -ForegroundColor Red
        $script:FailCount++
        return
    }
    $content = Get-Content -Path $Path -Raw -Encoding UTF8
    if ($content -match 'default-model:\s*qwen') {
        Write-Host ("[PASS] {0} ai.default-model=qwen" -f $Label) -ForegroundColor Green
    }
    else {
        Write-Host ("[FAIL] {0} ai.default-model is not qwen" -f $Label) -ForegroundColor Red
        $script:FailCount++
    }
}

function Assert-DevStubMapping {
    param(
        [string]$Path,
        [string]$Label
    )
    $content = Get-Content -Path $Path -Raw -Encoding UTF8
    if ($content -match 'dev-stub-enabled:\s*\$\{AI_DEV_STUB:false\}') {
        Write-Host ("[PASS] {0} maps AI_DEV_STUB" -f $Label) -ForegroundColor Green
        return
    }
    Write-Host ("[FAIL] {0} missing AI_DEV_STUB mapping" -f $Label) -ForegroundColor Red
    $script:FailCount++
}

Assert-DefaultModelQwen -Path $nacosTpl -Label "nacos template"
Assert-DefaultModelQwen -Path $modYml -Label "module application.yml"
Assert-DevStubMapping -Path $nacosTpl -Label "nacos template"
Assert-DevStubMapping -Path $modYml -Label "module application.yml"

$hasQwen = [bool]$env:QWEN_API_KEY
$hasDeepseek = [bool]$env:DEEPSEEK_API_KEY
$devStub = ($env:AI_DEV_STUB -eq "true") -or ($env:AI_DEV_STUB -eq "1")

if ($hasQwen) {
    Write-Host ("[PASS] QWEN_API_KEY configured (len={0})" -f $env:QWEN_API_KEY.Length) -ForegroundColor Green
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
    $models = Invoke-RestMethod -Uri ($GatewayUrl.TrimEnd("/") + "/api/ai/chat/models") `
        -Headers $headers -TimeoutSec 15
    $count = 0
    if ($models.data) { $count = @($models.data).Count }
    if ($count -gt 0) {
        Write-Host ("[PASS] Gateway /api/ai/chat/models available count={0}" -f $count) -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] /api/ai/chat/models returned empty" -ForegroundColor Red
        $script:FailCount++
    }
}
catch {
    Write-Host ("[FAIL] Gateway models API: {0}" -f $_.Exception.Message) -ForegroundColor Red
    $script:FailCount++
}

if (Test-Path $IntelligenceLog) {
    $stubLine = Select-String -Path $IntelligenceLog -Pattern "Stub" -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -Last 1
    $keyLine = Select-String -Path $IntelligenceLog -Pattern "API Key" -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($stubLine) {
        Write-Host "[INFO] Intelligence log: possible stub/key line found" -ForegroundColor DarkGray
    }
    elseif ($keyLine) {
        Write-Host "[INFO] Intelligence log: API Key mention found" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Tip: set QWEN_API_KEY in deploy/.env for production; local use AI_DEV_STUB=true" -ForegroundColor DarkGray
if ($script:FailCount -gt 0) {
    Write-Host "Result: FAILED (LLM config/models)" -ForegroundColor Red
    exit 1
}
Write-Host "Result: LLM CONFIG CHECK PASS" -ForegroundColor Green
exit 0
