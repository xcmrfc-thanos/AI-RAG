#!/bin/bash

echo "========================================="
echo "测试 /api/auth/me 接口"
echo "========================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 测试登录接口获取token
echo -e "\n${YELLOW}步骤1：测试登录接口${NC}"
echo "POST http://localhost:8080/api/auth/auth/login"
echo "Request Body: {\"username\": \"admin\", \"password\": \"123456\"}"

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "123456"}')

echo "Response: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}登录失败，无法获取Token${NC}"
    exit 1
fi

echo -e "${GREEN}登录成功，获取到Token: $TOKEN${NC}"

# 2. 测试获取用户信息接口（不携带token）
echo -e "\n${YELLOW}步骤2：测试 /api/auth/me 接口（不携带Token）${NC}"
echo "GET http://localhost:8080/api/auth/me"

ME_RESPONSE_NO_TOKEN=$(curl -s -w "\nHTTP Status: %{http_code}" -X GET http://localhost:8080/api/auth/me \
  -H "Content-Type: application/json")

echo "Response: $ME_RESPONSE_NO_TOKEN"

# 3. 测试获取用户信息接口（携带token）
echo -e "\n${YELLOW}步骤3：测试 /api/auth/me 接口（携带Token）${NC}"
echo "GET http://localhost:8080/api/auth/me"
echo "Authorization: Bearer $TOKEN"

ME_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $ME_RESPONSE"

# 4. 测试无效token
echo -e "\n${YELLOW}步骤4：测试 /api/auth/me 接口（携带无效Token）${NC}"
echo "GET http://localhost:8080/api/auth/me"
echo "Authorization: Bearer invalid-token-123"

ME_RESPONSE_INVALID=$(curl -s -w "\nHTTP Status: %{http_code}" -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer invalid-token-123" \
  -H "Content-Type: application/json")

echo "Response: $ME_RESPONSE_INVALID"

echo -e "\n========================================="
echo -e "${GREEN}测试完成${NC}"
echo "========================================="
