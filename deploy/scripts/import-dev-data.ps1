#Requires -Version 5.1
# 导入 backend/sql/data 样例数据（DDL 已由 MySQL 容器 init 完成）
$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SqlDir = Join-Path (Split-Path -Parent $DeployDir) "backend\sql"
$Password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "123456" }

. (Join-Path $DeployDir "scripts\mysql-import-utils.ps1")

$files = @(
    "data\init_kb_user.sql",
    "data\init_menu_permission.sql",
    "data\init_permission_resource.sql",
    "data\init_agent_permission.sql",
    "data\init_phase7_permission_closure.sql",
    "data\init_kb_document.sql",
    "data\init_kb_foundation.sql",
    "data\init_notification_template.sql",
    "data\init_kb_intelligence.sql"
)

foreach ($rel in $files) {
    $hostPath = Join-Path $SqlDir $rel
    if (-not (Test-Path $hostPath)) { throw "找不到 $hostPath" }
    Write-Host "  -> $rel"
    Invoke-MysqlFile -Path $hostPath -Password $Password
}

Write-Host "样例数据导入完成 (admin / admin123)" -ForegroundColor Green
