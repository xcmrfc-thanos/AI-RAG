#Requires -Version 5.1
<#
.SYNOPSIS
  Intelligence 搜索 + RAG 混合压测，用于 JVM 调优验收（任务 35）。
.PARAMETER BaseUrl
  网关或 intelligence 基址，默认 http://127.0.0.1:8080
.PARAMETER Direct
  直连 intelligence :8091（不经网关 StripPrefix）
.PARAMETER Iterations
  每类接口请求轮数
.PARAMETER Concurrent
  并发 Job 数（PowerShell 7+ 推荐；5.1 下串行执行）
#>
param(
    [string]$BaseUrl = "http://127.0.0.1:8080",
    [switch]$Direct,
    [int]$Iterations = 30,
    [int]$Concurrent = 4
)

$ErrorActionPreference = "Stop"

if ($Direct) {
    $BaseUrl = "http://127.0.0.1:8091"
    $SearchPath = "/"
    $RagSearchPath = "/rag/search"
} else {
    $SearchPath = "/api/search/"
    $RagSearchPath = "/api/ai/rag/search"
}

$SearchUrl = "$BaseUrl$SearchPath"
$RagUrl = "$BaseUrl$RagSearchPath"

function Invoke-StressRequest {
    param(
        [string]$Name,
        [string]$Url,
        [object]$Body
    )
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $json = $Body | ConvertTo-Json -Compress
        $resp = Invoke-RestMethod -Uri $Url -Method Post -Body $json -ContentType "application/json; charset=utf-8" -TimeoutSec 60
        $sw.Stop()
        return [PSCustomObject]@{
            Name     = $Name
            Ok       = $true
            Ms       = $sw.ElapsedMilliseconds
            Code     = if ($resp.code) { $resp.code } else { 200 }
        }
    } catch {
        $sw.Stop()
        return [PSCustomObject]@{
            Name     = $Name
            Ok       = $false
            Ms       = $sw.ElapsedMilliseconds
            Code     = $_.Exception.Message
        }
    }
}

function Get-IntelligenceProcessMemoryMb {
    $conn = Get-NetTCPConnection -LocalPort 8091 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if (-not $proc) { return $null }
    return [math]::Round($proc.WorkingSet64 / 1MB, 1)
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Intelligence 搜索+RAG 压测" -ForegroundColor Cyan
Write-Host " Search: $SearchUrl" -ForegroundColor DarkGray
Write-Host " RAG:    $RagUrl" -ForegroundColor DarkGray
Write-Host " 轮数: $Iterations  并发: $Concurrent" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan

$memBefore = Get-IntelligenceProcessMemoryMb
if ($null -ne $memBefore) {
    Write-Host "压测前 Java 工作集约: ${memBefore} MB" -ForegroundColor DarkGray
}

$results = [System.Collections.Generic.List[object]]::new()
$keywords = @("知识库", "文档", "技术", "搜索", "RAG", "索引", "图谱", "测试")

for ($i = 0; $i -lt $Iterations; $i++) {
    $kw = $keywords[$i % $keywords.Length]
    $searchBody = @{
        keyword    = $kw
        current    = 1
        size       = 10
        searchMode = "keyword"
    }
    $ragBody = @{
        query         = "关于${kw}的内容"
        topK          = 5
        enableRerank  = $false
    }
    $results.Add((Invoke-StressRequest -Name "search" -Url $SearchUrl -Body $searchBody))
    $results.Add((Invoke-StressRequest -Name "rag" -Url $RagUrl -Body $ragBody))
}

$ok = ($results | Where-Object { $_.Ok }).Count
$fail = $results.Count - $ok
$avgMs = if ($ok -gt 0) { [math]::Round(($results | Where-Object { $_.Ok } | Measure-Object -Property Ms -Average).Average, 1) } else { 0 }
$p95 = if ($ok -gt 0) {
    $sorted = ($results | Where-Object { $_.Ok } | Sort-Object Ms).Ms
    $idx = [math]::Min($sorted.Count - 1, [math]::Ceiling($sorted.Count * 0.95) - 1)
    $sorted[$idx]
} else { 0 }

$memAfter = Get-IntelligenceProcessMemoryMb

Write-Host ""
Write-Host "结果: 成功 $ok / $($results.Count)  失败 $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "延迟: avg=${avgMs}ms  p95=${p95}ms" -ForegroundColor Cyan
if ($null -ne $memAfter) {
    Write-Host "压测后 Java 工作集约: ${memAfter} MB" -ForegroundColor DarkGray
}

if ($fail -gt 0) {
    Write-Host "`n失败样本:" -ForegroundColor Yellow
    $results | Where-Object { -not $_.Ok } | Select-Object -First 5 | Format-Table -AutoSize
    exit 1
}

Write-Host "`n压测通过（无请求失败）。请检查 deploy/logs/kb-intelligence*.log 无 OutOfMemoryError。" -ForegroundColor Green
exit 0
