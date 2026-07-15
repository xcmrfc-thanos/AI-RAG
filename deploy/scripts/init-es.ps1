#Requires -Version 5.1
# 创建 ES 索引（无 IK 插件时使用 standard 分词；生产请安装 IK 后重建）
$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EsDir = Join-Path (Split-Path -Parent $DeployDir) "backend\sql\es"
$EsHost = if ($env:ES_URL) { $env:ES_URL } else { "http://127.0.0.1:20920" }
$User = "elastic"
$Pass = if ($env:ELASTIC_PASSWORD) { $env:ELASTIC_PASSWORD } else { "susan123" }
$pair = "${User}:${Pass}"
$bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
$base64 = [System.Convert]::ToBase64String($bytes)
$headers = @{ Authorization = "Basic $base64" }

function New-EsIndex {
    param([string]$Name, [string]$JsonPath)
    $body = Get-Content $JsonPath -Raw -Encoding UTF8
    # 本地无 IK 时替换为 standard，避免创建失败
    $body = $body -replace 'ik_max_word', 'standard' -replace 'ik_smart', 'standard'
    try {
        Invoke-RestMethod -Uri "$EsHost/$Name" -Method PUT -Headers $headers -Body $body -ContentType "application/json" | Out-Null
        Write-Host "  -> $Name" -ForegroundColor Green
    } catch {
        if ($_.Exception.Message -match "resource_already_exists") {
            Write-Host "  -> $Name (已存在)" -ForegroundColor DarkGray
        } else {
            Write-Host "  WARN $Name : $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host "等待 Elasticsearch..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-RestMethod -Uri "$EsHost/_cluster/health" -Headers $headers -TimeoutSec 5 | Out-Null
        break
    } catch { Start-Sleep -Seconds 2 }
}

New-EsIndex -Name "kb_document" -JsonPath (Join-Path $EsDir "kb_document_index.json")
New-EsIndex -Name "kb_chunk" -JsonPath (Join-Path $EsDir "kb_chunk_index.json")
Write-Host "ES 索引初始化完成（dev 使用 standard 分词）" -ForegroundColor Green
