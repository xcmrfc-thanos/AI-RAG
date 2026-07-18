#!/usr/bin/env bash
# Intelligence BC — 创建 ES 索引（需 ES 8.x 已启动）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ES_HOST="${ES_HOST:-http://127.0.0.1:9200}"
ES_USER="${ES_USER:-elastic}"
ES_PASS="${ES_PASS:-}"
DOCUMENT_INDEX="${DOCUMENT_INDEX:-kb_document}"
CHUNK_INDEX="${CHUNK_INDEX:-kb_chunk}"

auth=()
if [[ -n "$ES_PASS" ]]; then
  auth=(-u "${ES_USER}:${ES_PASS}")
fi

put_index() {
  local name="$1"
  local body="$2"
  echo ">>> PUT ${name}"
  curl -sS "${auth[@]}" -X PUT "${ES_HOST}/${name}" \
    -H 'Content-Type: application/json' \
    -d @"${body}"
  echo ""
}

put_index "${DOCUMENT_INDEX}" "${SCRIPT_DIR}/kb_document_index.json"
put_index "${CHUNK_INDEX}" "${SCRIPT_DIR}/kb_chunk_index.json"

echo "Done. Indices: ${DOCUMENT_INDEX}, ${CHUNK_INDEX}"
