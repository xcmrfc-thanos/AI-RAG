#Requires -Version 5.1
# 清理并重新导入 backend/nacos/*.template → Nacos（namespace: knowledge）
$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$NacosDir = Join-Path (Split-Path -Parent $DeployDir) "backend\nacos"
$BaseUrl = if ($env:NACOS_ADDR) { "http://$($env:NACOS_ADDR)" } else { "http://127.0.0.1:20848" }
$User = if ($env:NACOS_USER) { $env:NACOS_USER } else { "nacos" }
$Pass = if ($env:NACOS_PASSWORD) { $env:NACOS_PASSWORD } else { "nacos" }
$Namespace = if ($env:NACOS_NAMESPACE) { $env:NACOS_NAMESPACE } else { "knowledge" }
$Group = if ($env:NACOS_GROUP) { $env:NACOS_GROUP } else { "KNOWLEDGE_BASE" }

# 已废弃 DataId（清理旧六服务配置，避免误用）
$ObsoleteDataIds = @(
    "kb-auth-api-dev.yaml",
    "kb-document-dev.yaml",
    "kb-ai-dev.yaml",
    "kb-search-dev.yaml",
    "kb-graph-dev.yaml",
    "kb-foundation-dev.yaml",
    "kb-user-auth-dev.yaml"
)

function Get-NacosToken {
    try {
        $body = "username=$User&password=$Pass"
        $resp = Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/auth/login" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded" -ErrorAction Stop
        return $resp.accessToken
    } catch {
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
    } catch { }
    $body = @{
        customNamespaceId = $Namespace
        namespaceName     = $Namespace
        namespaceDesc       = "AI-RAG local docker"
    }
    Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/console/namespaces" -Method POST -Headers (Get-NacosHeaders -Token $Token) -Body $body | Out-Null
    Write-Host "  创建 namespace: $Namespace" -ForegroundColor Green
}

function Remove-Config {
    param(
        [string]$Token,
        [string]$DataId
    )
    $query = "dataId=$DataId&group=$Group&tenant=$Namespace"
    try {
        Invoke-RestMethod -Uri "$BaseUrl/nacos/v1/cs/configs?$query" -Method DELETE -Headers (Get-NacosHeaders -Token $Token) | Out-Null
        Write-Host "  删除 $DataId" -ForegroundColor DarkYellow
    } catch {
        Write-Host "  跳过删除 $DataId（可能不存在）" -ForegroundColor DarkGray
    }
}

function Publish-Config {
    param(
        [string]$Token,
        [string]$DataId,
        [string]$FilePath
    )
    $content = Get-Content $FilePath -Raw -Encoding UTF8
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

Write-Host "登录 Nacos..." -ForegroundColor Cyan
$token = Get-NacosToken
Ensure-Namespace -Token $token

Write-Host "清理废弃配置..." -ForegroundColor Cyan
foreach ($id in $ObsoleteDataIds) {
    Remove-Config -Token $token -DataId $id
}

$map = [ordered]@{
    "application-dev.yaml"        = "application-dev.yaml.template"
    "kb-gateway-dev.yaml"       = "kb-gateway-dev.yaml.template"
    "kb-core-dev.yaml"          = "kb-core-dev.yaml.template"
    "kb-intelligence-dev.yaml"  = "kb-intelligence-dev.yaml.template"
    "kb-file-dev.yaml"          = "kb-file-dev.yaml.template"
    "kb-statistics-dev.yaml"    = "kb-statistics-dev.yaml.template"
    "kb-agent-dev.yaml"         = "kb-agent-dev.yaml.template"
}

Write-Host "导入配置 (group=$Group, ns=$Namespace)..." -ForegroundColor Cyan
foreach ($dataId in $map.Keys) {
    $file = Join-Path $NacosDir $map[$dataId]
    if (-not (Test-Path $file)) { throw "找不到 $file" }
    Publish-Config -Token $token -DataId $dataId -FilePath $file
}

Write-Host "Nacos 配置导入完成（共 $($map.Count) 项）" -ForegroundColor Green
