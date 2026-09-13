#Requires -Version 5.1
<#
.SYNOPSIS
  清理超过保留期的 Agent Run/Step（任务 70 运维脚本）

.PARAMETER RetentionDays
  保留天数，默认 30

.PARAMETER MysqlPassword
  MySQL root 密码

.PARAMETER Container
  MySQL 容器名
#>
param(
    [int]$RetentionDays = 30,
    [string]$MysqlPassword = $(if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "123456" }),
    [string]$Container = "knowledge-mysql"
)

$ErrorActionPreference = "Stop"
$days = [Math]::Max(1, $RetentionDays)

$sql = @"
SET NAMES utf8mb4;
USE kb_agent;
DELETE s FROM agent_run_step s
INNER JOIN agent_run r ON r.id = s.run_id
WHERE r.created_at < DATE_SUB(NOW(), INTERVAL $days DAY);
DELETE FROM agent_run
WHERE created_at < DATE_SUB(NOW(), INTERVAL $days DAY);
SELECT 'cleanup done' AS message;
"@

$tmp = Join-Path $env:TEMP ("cleanup-agent-runs-" + [guid]::NewGuid().ToString("N") + ".sql")
[System.IO.File]::WriteAllText($tmp, $sql, [System.Text.UTF8Encoding]::new($false))
try {
    docker cp $tmp "${Container}:/tmp/cleanup-agent-runs.sql"
    docker exec $Container mysql -uroot "-p$MysqlPassword" -e "source /tmp/cleanup-agent-runs.sql"
    Write-Host "Agent Run 清理完成 retentionDays=$days" -ForegroundColor Green
} finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
