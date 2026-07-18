# 切换 Intelligence 网关路由优先级（P1-6 / P1-7）
# 用法: .\switch-intelligence-primary.ps1 -Mode primary|legacy

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("primary", "legacy")]
    [string]$Mode
)

$ErrorActionPreference = "Stop"
$gatewayYml = Join-Path $PSScriptRoot "..\src\main\resources\application.yml"

if (-not (Test-Path $gatewayYml)) {
    throw "找不到 application.yml: $gatewayYml"
}

$content = Get-Content $gatewayYml -Raw -Encoding UTF8

if ($Mode -eq "primary") {
    $content = $content -replace '(?m)(- id: kb-ai\r?\n\s+uri: lb://kb-ai\r?\n\s+)order: 0', '$1order: 10'
    $content = $content -replace '(?m)(- id: kb-graph\r?\n\s+uri: lb://kb-graph\r?\n\s+)order: 0', '$1order: 10'
    $content = $content -replace '(?m)(- id: kb-search\r?\n\s+uri: lb://kb-search\r?\n\s+)order: 0', '$1order: 10'
    $content = $content -replace '(?m)(- id: kb-intelligence-ai-main\r?\n\s+uri: lb://kb-intelligence\r?\n\s+)order: 1', '$1order: -1'
    $content = $content -replace '(?m)(- id: kb-intelligence-search-main\r?\n\s+uri: lb://kb-intelligence\r?\n\s+)order: 1', '$1order: -1'
    $content = $content -replace '(?m)(- id: kb-intelligence-graph-main\r?\n\s+uri: lb://kb-intelligence\r?\n\s+)order: 1', '$1order: -1'
    Write-Host "已切换为 intelligence-primary：主路由 order=-1，旧路由 order=10"
}
else {
    $content = $content -replace '(?m)(- id: kb-ai\r?\n\s+uri: lb://kb-ai\r?\n\s+)order: 10', '$1order: 0'
    $content = $content -replace '(?m)(- id: kb-graph\r?\n\s+uri: lb://kb-graph\r?\n\s+)order: 10', '$1order: 0'
    $content = $content -replace '(?m)(- id: kb-search\r?\n\s+uri: lb://kb-search\r?\n\s+)order: 10', '$1order: 0'
    $content = $content -replace '(?m)(- id: kb-intelligence-ai-main\r?\n\s+uri: lb://kb-intelligence\r?\n\s+)order: -1', '$1order: 1'
    $content = $content -replace '(?m)(- id: kb-intelligence-search-main\r?\n\s+uri: lb://kb-intelligence\r?\n\s+)order: -1', '$1order: 1'
    $content = $content -replace '(?m)(- id: kb-intelligence-graph-main\r?\n\s+uri: lb://kb-intelligence\r?\n\s+)order: -1', '$1order: 1'
    Write-Host "已切换为 legacy：旧路由 order=0，主路由 order=1"
}

Set-Content -Path $gatewayYml -Value $content -Encoding UTF8 -NoNewline
Write-Host "已写入 $gatewayYml，请重启 kb-gateway"
