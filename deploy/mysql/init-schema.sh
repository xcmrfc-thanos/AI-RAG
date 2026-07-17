#!/bin/bash
# MySQL 首次启动自动导入 kb DDL（挂载 backend/sql/schema）
set -e

echo "[kb-mysql-init] importing schema..."

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" < /sql-schema/00_create_databases.sql

for f in kb_user kb_document kb_file kb_foundation kb_statistics kb_favorite kb_notification_template kb_intelligence kb_agent; do
  echo "[kb-mysql-init] /sql-schema/${f}.sql"
  mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" < "/sql-schema/${f}.sql"
done

echo "[kb-mysql-init] schema done"
