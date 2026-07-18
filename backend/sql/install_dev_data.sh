#!/bin/bash
# 企业知识库 - 开发样例数据（DML，可选）
set -e
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-123456}"
SQL_DIR="$(cd "$(dirname "$0")" && pwd)"

for f in data/init_kb_user.sql data/init_menu_permission.sql data/init_permission_resource.sql \
         data/init_agent_permission.sql \
         data/init_phase7_permission_closure.sql \
         data/init_kb_document.sql data/init_kb_foundation.sql data/init_kb_intelligence.sql; do
  echo "${f}"
  mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" < "${SQL_DIR}/${f}"
done
echo "完成。默认 admin / admin123"
