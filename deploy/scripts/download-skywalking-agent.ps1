# download-skywalking-agent.ps1
# 下载 SkyWalking Agent 用于 Docker 镜像构建
# 放到 deploy/ 目录并运行

param(
    [string]$Version = "9.7.0",
    [string]$OutputDir = $PSScriptRoot
)

$Url = "https://archive.apache.org/dist/skywalking/${Version}/apache-skywalking-apm-${Version}.tar.gz"
$OutputFile = Join-Path $OutputDir "skywalking/apache-skywalking-apm-${Version}.tar.gz"

# 创建目录
$SkywalkingDir = Join-Path $OutputDir "skywalking"
if (-not (Test-Path $SkywalkingDir)) {
    New-Item -ItemType Directory -Path $SkywalkingDir | Out-Null
}

# 检查是否已下载
if (Test-Path $OutputFile) {
    $size = (Get-Item $OutputFile).Length / 1MB
    Write-Host "已存在: $OutputFile ($([math]::Round($size, 2)) MB)"
    Write-Host "如需重新下载，请先删除该文件"
    exit 0
}

Write-Host "正在下载 SkyWalking $Version Agent..."
Write-Host "URL: $Url"
Write-Host "目标: $OutputFile"
Write-Host ""

try {
    # 使用进度条显示下载进度
    $ProgressPreference = 'SilentlyContinue'  # 加快下载
    Invoke-WebRequest -Uri $Url -OutFile $OutputFile -UseBasicParsing -TimeoutSec 300
    
    $size = (Get-Item $OutputFile).Length / 1MB
    Write-Host ""
    Write-Host "下载完成！ ($([math]::Round($size, 2)) MB)"
    Write-Host "文件位置: $OutputFile"
} catch {
    Write-Host "下载失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "备选方案："
    Write-Host "1. 使用浏览器下载: $Url"
    Write-Host "2. 将文件重命名为 apache-skywalking-apm-${Version}.tar.gz"
    Write-Host "3. 放入 deploy/skywalking/ 目录"
}
