#Requires -Version 5.1
# Import backend/nacos/*.template into Nacos (namespace: knowledge)
# 导入前加载 deploy/.env，展开 ${VAR:default}，避免手填 QWEN/SILICONFLOW 等 API Key
$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$NacosDir = Join-Path (Split-Path -Parent $DeployDir) "backend\nacos"
$BaseUrl = if ($env:NACOS_ADDR) { "http://$($env:NACOS_ADDR)" } else { "http://127.0.0.1:20848" }
$User = if ($env:NACOS_USER) { $env:NACOS_USER } else { "nacos" }
$Pass = if ($env:NACOS_PASSWORD) { $env:NACOS_PASSWORD } else { "nacos" }
$Namespace = if ($env:NACOS_NAMESPACE) { $env:NACOS_NAMESPACE } else { "knowledge" }
$Group = if ($env:NACOS_GROUP) { $env:NACOS_GROUP } else { "KNOWLEDGE_BASE" }

$ObsoleteDataIds = @(
    "kb-auth-api-dev.yaml",
    "kb-document-dev.yaml",
    "kb-ai-dev.yaml",
    "kb-search-dev.yaml",
    "kb-graph-dev.yaml",
    "kb-foundation-dev.yaml",
    "kb-user-auth-dev.yaml"
)

# 加载 deploy/.env 到当前进程环境变量。
function Import-DeployDotEnv {
    $envFile = Join-Path $DeployDir ".env"
    if (-not (Test-Path $envFile)) {
        Write-Host "  WARN: missing deploy/.env — placeholders not expanded" -ForegroundColor Yellow
        return
    }
    Get-Content $envFile -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^\s*([^#=]+?)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
        }
    }
    Write-Host "  loaded deploy/.env into process env" -ForegroundColor DarkGray
}

# 展开 Spring 风格 ${VAR} / ${VAR:default}。
function Expand-SpringPlaceholders {
    param([string]$Content)
    $patternDefault = '\$\{([A-Za-z0-9_.]+)\:([^}]*)\}'
    $Content = [regex]::Replace($Content, $patternDefault, {
        param($m)
        $name = $m.Groups[1].Value
        $def = $m.Groups[2].Value
        $val = [Environment]::GetEnvironmentVariable($name, 'Process')
        if ($null -eq $val -or $val -eq '') { return $def }
        return $val
    })
    $patternPlain = '\$\{([A-Za-z0-9_.]+)\}'
    $Content = [regex]::Replace($Content, $patternPlain, {
        param($m)
        $name = $m.Groups[1].Value
        $val = [Environment]::GetEnvironmentVariable($name, 'Process')
        if ($null -eq $val) { return $m.Value }
        return $val
    })
    return $Content
}

# 脱敏打印关键 API Key 是否已设置。
function Write-EnvExpandSummary {
    $keys = @(
        'QWEN_API_KEY',
        'SILICONFLOW_API_KEY',
        'DEEPSEEK_API_KEY',
        'RAG_EMBEDDING_API_KEY',
        'RAG_RERANK_API_KEY',
        'KB_INTERNAL_HMAC_SECRET'
    )
    $parts = @()
    foreach ($k in $keys) {
        $v = [Environment]::GetEnvironmentVariable($k, 'Process')
        if ($null -eq $v -or $v -eq '') {
            $parts += "$k=empty"
        }
        else {
            $parts += ("{0}=set(len={1})" -f $k, $v.Length)
        }
    }
    Write-Host ("  env expand: " + ($parts -join ', ')) -ForegroundColor DarkGray
}

function Get-NacosToken {
    try {
        $body = "username=$User&password=$Pass"
        $resp = Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/auth/login" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded" -ErrorAction Stop
        return $resp.accessToken
    }
    catch {
        return $null
    }
}

function Get-NacosHeaders {
    param([string]$Token)
    if ($Token) { return @{ Authorization = "Bearer $Token" } }
    return @{}
}

function Ensure-Namespace {
    param([string]$Token)
    try {
        $list = Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/console/namespaces" -Headers (Get-NacosHeaders -Token $Token)
        if ($list.data | Where-Object { $_.namespace -eq $Namespace -or $_.namespaceShowName -eq $Namespace }) {
            return
        }
    }
    catch { }
    $body = @{
        customNamespaceId = $Namespace
        namespaceName     = $Namespace
        namespaceDesc       = "AI-RAG local docker"
    }
    Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/console/namespaces" -Method POST -Headers (Get-NacosHeaders -Token $Token) -Body $body | Out-Null
    Write-Host "  created namespace: $Namespace" -ForegroundColor Green
}

function Remove-Config {
    param(
        [string]$Token,
        [string]$DataId
    )
    $query = "dataId=$DataId&group=$Group&tenant=$Namespace"
    try {
        Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/cs/configs?$query" -Method DELETE -Headers (Get-NacosHeaders -Token $Token) | Out-Null
        Write-Host "  removed $DataId" -ForegroundColor DarkYellow
    }
    catch {
        Write-Host "  skip remove $DataId" -ForegroundColor DarkGray
    }
}

function Publish-Config {
    param(
        [string]$Token,
        [string]$DataId,
        [string]$FilePath
    )
    $raw = Get-Content $FilePath -Raw -Encoding UTF8
    $content = Expand-SpringPlaceholders -Content $raw
    $body = @{
        dataId  = $DataId
        group   = $Group
        content = $content
        type    = "yaml"
        tenant  = $Namespace
    }
    Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/cs/configs" -Method POST -Headers (Get-NacosHeaders -Token $Token) -Body $body | Out-Null
    Write-Host "  -> $DataId" -ForegroundColor Green
}

Write-Host "Load .env + expand placeholders..." -ForegroundColor Cyan
Import-DeployDotEnv
Write-EnvExpandSummary

Write-Host "Login Nacos..." -ForegroundColor Cyan
$token = Get-NacosToken
Ensure-Namespace -Token $token

Write-Host "Remove obsolete configs..." -ForegroundColor Cyan
foreach ($id in $ObsoleteDataIds) {
    Remove-Config -Token $token -DataId $id
}

$map = [ordered]@{
    "application-dev.yaml"       = "application-dev.yaml.template"
    "kb-gateway-dev.yaml"        = "kb-gateway-dev.yaml.template"
    "kb-core-dev.yaml"           = "kb-core-dev.yaml.template"
    "kb-intelligence-dev.yaml"   = "kb-intelligence-dev.yaml.template"
    "kb-file-dev.yaml"           = "kb-file-dev.yaml.template"
    "kb-statistics-dev.yaml"     = "kb-statistics-dev.yaml.template"
    "kb-agent-dev.yaml"          = "kb-agent-dev.yaml.template"
}

Write-Host "Import configs group=$Group ns=$Namespace ..." -ForegroundColor Cyan
foreach ($dataId in $map.Keys) {
    $file = Join-Path $NacosDir $map[$dataId]
    if (-not (Test-Path $file)) { throw "missing $file" }
    Publish-Config -Token $token -DataId $dataId -FilePath $file
}

Write-Host ("Nacos import done: " + $map.Count + " configs") -ForegroundColor Green
