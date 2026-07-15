#Requires -Version 5.1
# 重新导入 backend/sql/schema 全部 DDL（库已存在时补表/重建）
$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SchemaDir = Join-Path (Split-Path -Parent $DeployDir) "backend\sql\schema"
$Password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "123456" }

. (Join-Path $DeployDir "scripts\mysql-import-utils.ps1")

$files = @(
    "00_create_databases.sql",
    "kb_user.sql",
    "kb_document.sql",
    "kb_file.sql",
    "kb_foundation.sql",
    "kb_statistics.sql",
    "kb_favorite.sql",
    "kb_notification_template.sql",
    "kb_intelligence.sql"
)

Write-Host "导入 schema -> kb-mysql (root/$Password)..." -ForegroundColor Cyan
foreach ($f in $files) {
    $path = Join-Path $SchemaDir $f
    if (-not (Test-Path $path)) { throw "找不到 $path" }
    Write-Host "  -> $f" -ForegroundColor Green
    Invoke-MysqlFile -Path $path -Password $Password
}

Write-Host "完成。查看表数量:" -ForegroundColor Green
docker exec kb-mysql mysql -uroot "-p$Password" -e "SELECT table_schema, COUNT(*) cnt FROM information_schema.tables WHERE table_schema LIKE 'kb_%' GROUP BY table_schema;"
