@echo off
REM =====================================================
REM 企业知识库系统 - 微服务数据库一键初始化脚本 (Windows)
REM =====================================================

setlocal enabledelayedexpansion

echo ========================================
echo 企业知识库系统 - 数据库初始化
echo ========================================
echo.

set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_PASS=123456

REM 检查MySQL连接
echo [1/10] 检查MySQL连接...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% -e "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo √ MySQL连接成功
) else (
    echo × MySQL连接失败，请检查配置
    pause
    exit /b 1
)

REM 创建所有数据库
echo.
echo [2/10] 创建所有数据库...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% < sql\00_create_databases.sql
if %errorlevel% equ 0 (
    echo √ 数据库创建成功
) else (
    echo × 数据库创建失败
    pause
    exit /b 1
)

REM 创建kb_user表
echo.
echo [3/10] 创建kb_user数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_user < sql\01_kb_user.sql
if %errorlevel% equ 0 (
    echo √ kb_user表创建成功
) else (
    echo × kb_user表创建失败
)

REM 创建kb_document表
echo.
echo [4/10] 创建kb_document数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_document < sql\02_kb_document.sql
if %errorlevel% equ 0 (
    echo √ kb_document表创建成功
) else (
    echo × kb_document表创建失败
)

REM 创建kb_search表
echo.
echo [5/10] 创建kb_search数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_search < sql\03_kb_search.sql
if %errorlevel% equ 0 (
    echo √ kb_search表创建成功
) else (
    echo × kb_search表创建失败
)

REM 创建kb_file表
echo.
echo [6/10] 创建kb_file数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_file < sql\04_kb_file.sql
if %errorlevel% equ 0 (
    echo √ kb_file表创建成功
) else (
    echo × kb_file表创建失败
)

REM 创建kb_ai表
echo.
echo [7/10] 创建kb_ai数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_ai < sql\05_kb_ai.sql
if %errorlevel% equ 0 (
    echo √ kb_ai表创建成功
) else (
    echo × kb_ai表创建失败
)

REM 创建kb_statistics表
echo.
echo [8/10] 创建kb_statistics数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_statistics < sql\06_kb_statistics.sql
if %errorlevel% equ 0 (
    echo √ kb_statistics表创建成功
) else (
    echo × kb_statistics表创建失败
)

REM 创建kb_notification表
echo.
echo [9/10] 创建kb_notification数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_notification < sql\07_kb_notification.sql
if %errorlevel% equ 0 (
    echo √ kb_notification表创建成功
) else (
    echo × kb_notification表创建失败
)

REM 创建kb_graph和kb_common表
echo.
echo [10/10] 创建kb_graph和kb_common数据库表...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_graph < sql\08_kb_graph.sql
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% kb_common < sql\09_kb_common.sql
if %errorlevel% equ 0 (
    echo √ kb_graph和kb_common表创建成功
) else (
    echo × kb_graph和kb_common表创建失败
)

REM 显示统计信息
echo.
echo ========================================
echo 数据库初始化完成统计
echo ========================================
echo.

mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASS% -e "SHOW DATABASES LIKE 'kb_%%';"

echo.
echo √ 所有数据库和表创建完成！
echo.
echo 下一步：
echo 1. 执行初始化数据脚本
echo 2. 启动各个微服务
echo.
pause
