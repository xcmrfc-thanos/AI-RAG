#!/bin/bash

# 403错误快速修复脚本

echo "🔍 403 Forbidden 错误诊断工具"
echo "================================"

# 检查后端是否运行
echo "1️⃣ 检查后端服务..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/auth/login | grep -q "200\|401\|400"; then
    echo "✅ 后端服务运行正常 (http://localhost:8080)"
else
    echo "❌ 后端服务无法访问，请确保后端运行在8080端口"
    echo "   启动命令示例: java -jar your-backend.jar"
fi

# 检查前端配置
echo ""
echo "2️⃣ 检查前端配置..."
if [ -f "vite.config.ts" ]; then
    echo "✅ Vite配置文件存在"
    if grep -q "target: 'http://localhost:8080'" vite.config.ts; then
        echo "✅ 代理配置指向正确的后端地址"
    else
        echo "❌ 代理配置可能有问题"
    fi
else
    echo "❌ Vite配置文件不存在"
fi

# 检查环境变量
echo ""
echo "3️⃣ 检查环境配置..."
if [ -f ".env.development" ]; then
    echo "✅ 开发环境配置存在"
    echo "📋 API_BASE_URL: $(grep VITE_API_BASE_URL .env.development || echo '未设置')"
else
    echo "⚠️  开发环境配置不存在"
fi

# 测试代理
echo ""
echo "4️⃣ 测试API访问..."
echo "📡 测试直接访问后端..."
DIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/auth/login)
echo "   直接访问状态码: $DIRECT_STATUS"

if [ "$DIRECT_STATUS" = "200" ] || [ "$DIRECT_STATUS" = "401" ]; then
    echo "   ✅ 后端API可以正常访问"
else
    echo "   ❌ 后端API访问异常"
fi

echo ""
echo "📋 诊断总结："
echo "================================"
echo "🔧 建议的修复步骤："
echo ""
echo "方案A：临时禁用CSRF（推荐用于开发环境）"
echo "在后端SecurityConfig中添加："
echo "  http.csrf().disable()"
echo ""
echo "方案B：添加CORS配置"
echo "在后端WebConfig中添加："
echo "  registry.addMapping(\"/api/**\")"
echo "    .allowedOrigins(\"http://localhost:3002\")"
echo "    .allowedMethods(\"*\")"
echo "    .allowedHeaders(\"*\")"
echo "    .allowCredentials(true);"
echo ""
echo "方案C：使用诊断工具"
echo "访问: http://localhost:3002/403-debug.html"
echo ""
echo "📚 详细文档: 403-SOLUTION.md"
echo ""
echo "🚀 下一步操作："
echo "1. 根据上述方案修改后端配置"
echo "2. 重启后端服务"
echo "3. 访问诊断工具验证"
echo "4. 测试登录功能"
