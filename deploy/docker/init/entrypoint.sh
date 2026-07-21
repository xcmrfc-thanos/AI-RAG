#!/usr/bin/env bash
# 全栈首次初始化：Nacos / 样例 DML / ES 索引 / RustFS bucket
set -euo pipefail

FLAG_DIR="${BOOTSTRAP_FLAG_DIR:-/bootstrap}"
FLAG_FILE="${FLAG_DIR}/nacos_bootstrapped"
FORCE="${FORCE_NACOS_IMPORT:-false}"
SKIP_SAMPLE="${SKIP_SAMPLE_DATA:-false}"
SKIP_ES="${SKIP_ES_INIT:-false}"
SKIP_RUSTFS="${SKIP_RUSTFS_INIT:-false}"

MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-123456}"
SQL_DATA_DIR="${SQL_DATA_DIR:-/sql-data}"
ES_URL="${ES_URL:-http://elasticsearch:9200}"
ELASTIC_PASSWORD="${ELASTIC_PASSWORD:-susan123}"
ES_SCHEMA_DIR="${ES_SCHEMA_DIR:-/es-schema}"
RUSTFS_ENDPOINT="${RUSTFS_ENDPOINT:-rustfs}"
RUSTFS_PORT="${RUSTFS_PORT:-9000}"
RUSTFS_ACCESS_KEY="${RUSTFS_ACCESS_KEY:-rustfsadmin}"
RUSTFS_SECRET_KEY="${RUSTFS_SECRET_KEY:-rustfsadmin}"
RUSTFS_BUCKET="${RUSTFS_BUCKET:-kb-files}"

mkdir -p "$FLAG_DIR"

wait_http() {
  local url="$1" max="${2:-60}"
  local i=0
  until curl -sf "$url" >/dev/null 2>&1; do
    i=$((i + 1))
    if [[ $i -ge $max ]]; then
      echo "timeout waiting $url"
      return 1
    fi
    sleep 3
  done
}

echo "[kb-init] wait mysql..."
for i in $(seq 1 60); do
  if mysqladmin ping -h"$MYSQL_HOST" -P"$MYSQL_PORT" -uroot -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null; then
    break
  fi
  sleep 3
done

echo "[kb-init] wait nacos..."
wait_http "http://${NACOS_ADDR:-nacos:8848}/nacos/v1/console/health/readiness" 60 || true

NEED_NACOS=false
if [[ "$FORCE" == "true" ]] || [[ ! -f "$FLAG_FILE" ]]; then
  NEED_NACOS=true
fi

if [[ "$NEED_NACOS" == "true" ]]; then
  echo "[kb-init] import nacos configs..."
  /init/import-nacos.sh
  touch "$FLAG_FILE"
else
  echo "[kb-init] skip nacos (already bootstrapped; set FORCE_NACOS_IMPORT=true to re-import)"
fi

if [[ "$SKIP_SAMPLE" != "true" ]]; then
  SAMPLE_FLAG="${FLAG_DIR}/sample_data_done"
  if [[ ! -f "$SAMPLE_FLAG" ]]; then
    echo "[kb-init] import sample sql..."
    shopt -s nullglob
    for f in "$SQL_DATA_DIR"/init_*.sql; do
      echo "  sql $(basename "$f")"
      mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 < "$f" || true
    done
    touch "$SAMPLE_FLAG"
  else
    echo "[kb-init] skip sample data (already imported)"
  fi
fi

if [[ "$SKIP_ES" != "true" ]]; then
  ES_FLAG="${FLAG_DIR}/es_done"
  if [[ ! -f "$ES_FLAG" ]]; then
    echo "[kb-init] wait elasticsearch..."
    for i in $(seq 1 40); do
      if curl -sf -u "elastic:${ELASTIC_PASSWORD}" "${ES_URL}/_cluster/health" >/dev/null; then break; fi
      sleep 5
    done
    for idx in kb_document kb_chunk; do
      json="${ES_SCHEMA_DIR}/${idx}_index.json"
      if [[ -f "$json" ]]; then
        echo "[kb-init] put index ${idx}"
        curl -sf -u "elastic:${ELASTIC_PASSWORD}" -H 'Content-Type: application/json' \
          -X PUT "${ES_URL}/${idx}" -d @"$json" || true
      fi
    done
    touch "$ES_FLAG"
  fi
fi

if [[ "$SKIP_RUSTFS" != "true" ]]; then
  R_FLAG="${FLAG_DIR}/rustfs_done"
  if [[ ! -f "$R_FLAG" ]]; then
    if command -v mc >/dev/null 2>&1; then
      echo "[kb-init] rustfs bucket via mc..."
      mc alias set rustfs "http://${RUSTFS_ENDPOINT}:${RUSTFS_PORT}" "$RUSTFS_ACCESS_KEY" "$RUSTFS_SECRET_KEY" || true
      mc mb -p "rustfs/${RUSTFS_BUCKET}" || true
      touch "$R_FLAG"
    else
      echo "[kb-init] skip rustfs (no mc); create bucket later via deploy/scripts/init-rustfs.ps1 or first upload"
      touch "$R_FLAG"
    fi
  fi
fi

echo "[kb-init] complete"
