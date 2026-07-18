@echo off
REM 企业知识库 - 开发样例数据（DML，可选）

set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_PASS=123456
set SQL_DIR=%~dp0

for %%F in (
    data\init_kb_user.sql
    data\init_menu_permission.sql
    data\init_permission_resource.sql
    data\init_agent_permission.sql
    data\init_phase7_permission_closure.sql
    data\init_kb_document.sql
    data\init_kb_foundation.sql
    data\init_kb_intelligence.sql
) do (
    echo %%F
    mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% < "%SQL_DIR%%%F"
)
echo 完成。默认 admin / admin123
pause
