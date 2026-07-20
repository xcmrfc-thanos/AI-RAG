#!/bin/bash
# 企业知识库 - 建库建表（DDL，默认 MySQL）
set -e
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-123456}"
SQL_DIR="$(cd "$(dirname "$0")" && pwd)"
SCHEMA_DIR="${SQL_DIR}/schema/mysql"

mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" -e "SELECT 1;" >/dev/null
mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" < "${SCHEMA_DIR}/00_create_databases.sql"
for f in kb_user kb_document kb_file kb_foundation kb_statistics kb_favorite \
         kb_notification_template kb_intelligence kb_agent; do
  echo "schema/mysql/${f}.sql"
  mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" < "${SCHEMA_DIR}/${f}.sql"
done
echo "完成。样例数据: ./install_dev_data.sh"
mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" -e "SHOW DATABASES LIKE 'kb_%';"
