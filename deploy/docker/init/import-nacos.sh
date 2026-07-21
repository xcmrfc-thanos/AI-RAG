#!/usr/bin/env bash
# 将 backend/nacos/*.template 展开环境变量后发布到 Nacos（对齐 import-nacos.ps1）
set -euo pipefail

NACOS_ADDR="${NACOS_ADDR:-nacos:8848}"
BASE_URL="http://${NACOS_ADDR}"
USER="${NACOS_USER:-nacos}"
PASS="${NACOS_PASSWORD:-nacos}"
NAMESPACE="${NACOS_NAMESPACE:-knowledge}"
GROUP="${NACOS_GROUP:-KNOWLEDGE_BASE}"
NACOS_DIR="${NACOS_DIR:-/nacos-templates}"

expand_file() {
  python3 - "$1" <<'PY'
import os, re, sys
path = sys.argv[1]
content = open(path, encoding="utf-8").read()

def repl_default(m):
    name, default = m.group(1), m.group(2)
    val = os.environ.get(name)
    return default if val is None or val == "" else val

content = re.sub(r"\$\{([A-Za-z0-9_]+):([^}]*)\}", repl_default, content)
content = re.sub(
    r"\$\{([A-Za-z0-9_]+)\}",
    lambda m: os.environ[m.group(1)] if m.group(1) in os.environ else m.group(0),
    content,
)
sys.stdout.write(content)
PY
}

echo "[import-nacos] login ${BASE_URL} ..."
TOKEN=""
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/nacos/v1/auth/login" \
  -d "username=${USER}&password=${PASS}" || true)
if [[ "$LOGIN_RESP" == *accessToken* ]]; then
  TOKEN=$(printf '%s' "$LOGIN_RESP" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
fi
AUTH_HDR=()
if [[ -n "$TOKEN" ]]; then
  AUTH_HDR=(-H "Authorization: Bearer ${TOKEN}")
fi

if ! curl -s "${AUTH_HDR[@]}" "${BASE_URL}/nacos/v1/console/namespaces" | grep -q "${NAMESPACE}"; then
  curl -s -X POST "${AUTH_HDR[@]}" "${BASE_URL}/nacos/v1/console/namespaces" \
    -d "customNamespaceId=${NAMESPACE}&namespaceName=${NAMESPACE}&namespaceDesc=AI-RAG" >/dev/null || true
  echo "[import-nacos] created namespace ${NAMESPACE}"
fi

for id in kb-auth-api-dev.yaml kb-document-dev.yaml kb-ai-dev.yaml kb-search-dev.yaml kb-graph-dev.yaml kb-foundation-dev.yaml kb-user-auth-dev.yaml; do
  curl -s -X DELETE "${AUTH_HDR[@]}" \
    "${BASE_URL}/nacos/v1/cs/configs?dataId=${id}&group=${GROUP}&tenant=${NAMESPACE}" >/dev/null || true
done

publish() {
  local dataId="$1"
  local file="$2"
  local content
  content=$(expand_file "$file")
  curl -s -X POST "${AUTH_HDR[@]}" "${BASE_URL}/nacos/v1/cs/configs" \
    --data-urlencode "dataId=${dataId}" \
    --data-urlencode "group=${GROUP}" \
    --data-urlencode "content=${content}" \
    --data-urlencode "type=yaml" \
    --data-urlencode "tenant=${NAMESPACE}" >/dev/null
  echo "[import-nacos] -> ${dataId}"
}

publish "application-dev.yaml" "${NACOS_DIR}/application-dev.yaml.template"
publish "kb-gateway-dev.yaml" "${NACOS_DIR}/kb-gateway-dev.yaml.template"
publish "kb-core-dev.yaml" "${NACOS_DIR}/kb-core-dev.yaml.template"
publish "kb-intelligence-dev.yaml" "${NACOS_DIR}/kb-intelligence-dev.yaml.template"
publish "kb-file-dev.yaml" "${NACOS_DIR}/kb-file-dev.yaml.template"
publish "kb-statistics-dev.yaml" "${NACOS_DIR}/kb-statistics-dev.yaml.template"
publish "kb-agent-dev.yaml" "${NACOS_DIR}/kb-agent-dev.yaml.template"

echo "[import-nacos] done"
