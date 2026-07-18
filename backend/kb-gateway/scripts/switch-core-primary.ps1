# 切换 Core 网关路由优先级（P2-6 / P2-7）
# 用法: .\switch-core-primary.ps1 -Mode primary|legacy

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
    $content = $content -replace '(?m)(- id: kb-user-auth\r?\n\s+uri: lb://kb-user-auth\r?\n\s+)order: 0', '$1order: 10'
    $content = $content -replace '(?m)(- id: kb-document\r?\n\s+uri: lb://kb-document\r?\n\s+)order: 0', '$1order: 10'
    $content = $content -replace '(?m)(- id: kb-foundation\r?\n\s+uri: lb://kb-foundation\r?\n\s+)order: 0', '$1order: 10'
    $content = $content -replace '(?m)(- id: kb-foundation-ws\r?\n\s+uri: lb:ws://kb-foundation\r?\n\s+)order: 0', '$1order: 10'
    $content = $content -replace '(?m)(- id: kb-core-auth-main\r?\n\s+uri: lb://kb-core\r?\n\s+)order: 1', '$1order: -1'
    $content = $content -replace '(?m)(- id: kb-core-document-main\r?\n\s+uri: lb://kb-core\r?\n\s+)order: 1', '$1order: -1'
    $content = $content -replace '(?m)(- id: kb-core-foundation-main\r?\n\s+uri: lb://kb-core\r?\n\s+)order: 1', '$1order: -1'
    $content = $content -replace '(?m)(- id: kb-core-ws-main\r?\n\s+uri: lb:ws://kb-core\r?\n\s+)order: 1', '$1order: -1'
    Write-Host "已切换为 core-primary：主路由 order=-1，旧路由 order=10"
}
else {
    $content = $content -replace '(?m)(- id: kb-user-auth\r?\n\s+uri: lb://kb-user-auth\r?\n\s+)order: 10', '$1order: 0'
    $content = $content -replace '(?m)(- id: kb-document\r?\n\s+uri: lb://kb-document\r?\n\s+)order: 10', '$1order: 0'
    $content = $content -replace '(?m)(- id: kb-foundation\r?\n\s+uri: lb://kb-foundation\r?\n\s+)order: 10', '$1order: 0'
    $content = $content -replace '(?m)(- id: kb-foundation-ws\r?\n\s+uri: lb:ws://kb-foundation\r?\n\s+)order: 10', '$1order: 0'
    $content = $content -replace '(?m)(- id: kb-core-auth-main\r?\n\s+uri: lb://kb-core\r?\n\s+)order: -1', '$1order: 1'
    $content = $content -replace '(?m)(- id: kb-core-document-main\r?\n\s+uri: lb://kb-core\r?\n\s+)order: -1', '$1order: 1'
    $content = $content -replace '(?m)(- id: kb-core-foundation-main\r?\n\s+uri: lb://kb-core\r?\n\s+)order: -1', '$1order: 1'
    $content = $content -replace '(?m)(- id: kb-core-ws-main\r?\n\s+uri: lb:ws://kb-core\r?\n\s+)order: -1', '$1order: 1'
    Write-Host "已切换为 legacy：旧路由 order=0，主路由 order=1"
}

Set-Content -Path $gatewayYml -Value $content -Encoding UTF8 -NoNewline
Write-Host "已写入 $gatewayYml，请重启 kb-gateway"
