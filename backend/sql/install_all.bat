@echo off
REM 企业知识库 - 建库建表（DDL）

setlocal enabledelayedexpansion
set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_PASS=123456
set SQL_DIR=%~dp0

echo [1/3] 检查 MySQL...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% -e "SELECT 1;" >nul 2>&1 || (echo 连接失败 & pause & exit /b 1)

echo [2/3] 建库...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% < "%SQL_DIR%schema\00_create_databases.sql"

echo [3/3] 建表...
for %%F in (
    kb_user.sql kb_document.sql kb_file.sql kb_foundation.sql
    kb_statistics.sql kb_favorite.sql kb_notification_template.sql
    kb_intelligence.sql kb_agent.sql
) do (
    echo   schema\%%F
    mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% < "%SQL_DIR%schema\%%F"
)

echo 完成。样例数据: install_dev_data.bat
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% -e "SHOW DATABASES LIKE 'kb_%%';"
pause
