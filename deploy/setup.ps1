#Requires -Version 5.1
<#
.SYNOPSIS
  AI-RAG 本地 Docker 一键部署：中间件 + SQL 样例 + Nacos 配置 + RustFS/ES 初始化
#>
param(
    [switch]$SkipSampleData,
    [switch]$SkipNacos,
    [switch]$SkipEs
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $DeployDir
$SqlDir = Join-Path $RootDir "backend\sql"
$NacosDir = Join-Path $RootDir "backend\nacos"

Set-Location $DeployDir

# 加载 .env 供子脚本使用
Get-Content (Join-Path $DeployDir ".env") -Encoding UTF8 | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " AI-RAG Docker 环境部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1/6] 启动 Docker Compose..." -ForegroundColor Yellow
docker compose --env-file .env up -d

Write-Host "`n[2/6] 等待服务就绪..." -ForegroundColor Yellow
$services = @("kb-mysql", "kb-redis", "kb-rabbitmq", "kb-mongodb", "kb-elasticsearch", "kb-neo4j", "kb-rustfs", "kb-nacos")
foreach ($svc in $services) {
    $max = 60
    $ok = $false
    for ($i = 0; $i -lt $max; $i++) {
        $status = docker inspect -f "{{.State.Health.Status}}" $svc 2>$null
        if ($status -eq "healthy") { $ok = $true; break }
        if (-not $status -and $svc -eq "kb-nacos") {
            # 部分版本 health 为空时尝试 curl
            try {
                Invoke-WebRequest -Uri "http://127.0.0.1:20848/nacos" -UseBasicParsing -TimeoutSec 3 | Out-Null
                $ok = $true; break
            } catch { }
        }
        Start-Sleep -Seconds 3
    }
    if ($ok) { Write-Host "  OK  $svc" -ForegroundColor Green }
    else { Write-Host "  WARN $svc 未 healthy，继续..." -ForegroundColor DarkYellow }
}

if (-not $SkipSampleData) {
    Write-Host "`n[3/6] 导入样例数据 (DML)..." -ForegroundColor Yellow
    & "$DeployDir\scripts\import-dev-data.ps1"
} else {
    Write-Host "`n[3/6] 跳过样例数据" -ForegroundColor DarkGray
}

if (-not $SkipNacos) {
    Write-Host "`n[4/6] 导入 Nacos 配置..." -ForegroundColor Yellow
    & "$DeployDir\scripts\import-nacos.ps1"
} else {
    Write-Host "`n[4/6] 跳过 Nacos" -ForegroundColor DarkGray
}

Write-Host "`n[5/6] 初始化 RustFS bucket..." -ForegroundColor Yellow
& "$DeployDir\scripts\init-rustfs.ps1"

if (-not $SkipEs) {
    Write-Host "`n[6/6] 创建 ES 索引..." -ForegroundColor Yellow
    & "$DeployDir\scripts\init-es.ps1"
} else {
    Write-Host "`n[6/6] 跳过 ES 索引" -ForegroundColor DarkGray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 部署完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host @"

服务地址:
  MySQL       localhost:20006  root / 123456
  Redis       localhost:20079  susan123
  RabbitMQ    localhost:20572  admin / susan123  控制台 :20156
  MongoDB     localhost:20017  mongodb / susan123  (库 knowledge_base)
  ES          localhost:20920  elastic / susan123
  Neo4j       localhost:20474  neo4j / susan123  Bolt :20687
  RustFS      localhost:20090  rustfsadmin / rustfsadmin  控制台 :20091
  Nacos       localhost:20848  nacos / nacos

下一步: .\start-services.ps1  或 IDE 启动各服务

"@ -ForegroundColor White
