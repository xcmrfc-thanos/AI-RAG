#!/bin/bash

# =====================================================
# 企业知识库系统 - 微服务数据库一键初始化脚本
# =====================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 数据库配置
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASS="123456"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}企业知识库系统 - 数据库初始化${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查MySQL连接
echo -e "${YELLOW}[1/10] 检查MySQL连接...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} -e "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ MySQL连接成功${NC}"
else
    echo -e "${RED}✗ MySQL连接失败，请检查配置${NC}"
    exit 1
fi

# 创建所有数据库
echo ""
echo -e "${YELLOW}[2/10] 创建所有数据库...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} < sql/00_create_databases.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库创建成功${NC}"
else
    echo -e "${RED}✗ 数据库创建失败${NC}"
    exit 1
fi

# 创建kb_user表
echo ""
echo -e "${YELLOW}[3/10] 创建kb_user数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_user < sql/01_kb_user.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_user表创建成功${NC}"
else
    echo -e "${RED}✗ kb_user表创建失败${NC}"
fi

# 创建kb_document表
echo ""
echo -e "${YELLOW}[4/10] 创建kb_document数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_document < sql/02_kb_document.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_document表创建成功${NC}"
else
    echo -e "${RED}✗ kb_document表创建失败${NC}"
fi

# 创建kb_search表
echo ""
echo -e "${YELLOW}[5/10] 创建kb_search数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_search < sql/03_kb_search.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_search表创建成功${NC}"
else
    echo -e "${RED}✗ kb_search表创建失败${NC}"
fi

# 创建kb_file表
echo ""
echo -e "${YELLOW}[6/10] 创建kb_file数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_file < sql/04_kb_file.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_file表创建成功${NC}"
else
    echo -e "${RED}✗ kb_file表创建失败${NC}"
fi

# 创建kb_ai表
echo ""
echo -e "${YELLOW}[7/10] 创建kb_ai数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_ai < sql/05_kb_ai.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_ai表创建成功${NC}"
else
    echo -e "${RED}✗ kb_ai表创建失败${NC}"
fi

# 创建kb_statistics表
echo ""
echo -e "${YELLOW}[8/10] 创建kb_statistics数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_statistics < sql/06_kb_statistics.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_statistics表创建成功${NC}"
else
    echo -e "${RED}✗ kb_statistics表创建失败${NC}"
fi

# 创建kb_notification表
echo ""
echo -e "${YELLOW}[9/10] 创建kb_notification数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_notification < sql/07_kb_notification.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_notification表创建成功${NC}"
else
    echo -e "${RED}✗ kb_notification表创建失败${NC}"
fi

# 创建kb_graph和kb_common表
echo ""
echo -e "${YELLOW}[10/10] 创建kb_graph和kb_common数据库表...${NC}"
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_graph < sql/08_kb_graph.sql
mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} kb_common < sql/09_kb_common.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ kb_graph和kb_common表创建成功${NC}"
else
    echo -e "${RED}✗ kb_graph和kb_common表创建失败${NC}"
fi

# 显示统计信息
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}数据库初始化完成统计${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} -e "
SELECT '数据库列表' AS info;
SHOW DATABASES LIKE 'kb_%';
"

echo ""
echo -e "${GREEN}✓ 所有数据库和表创建完成！${NC}"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo -e "1. 执行初始化数据脚本"
echo -e "2. 启动各个微服务"
echo ""
