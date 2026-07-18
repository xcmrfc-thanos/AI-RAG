#!/bin/bash

# 知识库前端项目启动脚本

set -e

echo "🚀 企业知识库前端项目启动脚本"
echo "================================"

# 检查Node.js版本
echo "📋 检查Node.js版本..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js版本过低，需要18.x或更高版本"
    echo "当前版本: $(node -v)"
    exit 1
fi
echo "✅ Node.js版本检查通过: $(node -v)"

# 检查npm版本
echo "📋 检查npm版本..."
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
    echo "⚠️  npm版本较低，建议使用9.x或更高版本"
    echo "当前版本: $(npm -v)"
fi
echo "✅ npm版本: $(npm -v)"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已存在"
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到.env文件，创建默认配置..."
    cat > .env << EOF
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=Enterprise Knowledge Base
VITE_APP_VERSION=1.0.0
EOF
    echo "✅ 环境变量文件已创建"
fi

# 询问用户操作
echo ""
echo "请选择操作:"
echo "1) 启动开发服务器"
echo "2) 构建生产版本"
echo "3) 预览生产版本"
echo "4) 类型检查"
echo "5) 代码检查"
echo "6) 退出"
read -p "请输入选项 (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🚀 启动开发服务器..."
        echo "访问地址: http://localhost:5173"
        echo "按 Ctrl+C 停止服务器"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "🔨 构建生产版本..."
        npm run build
        echo "✅ 构建完成，产物在 dist 目录"
        ;;
    3)
        echo ""
        echo "👀 预览生产版本..."
        if [ -d "dist" ]; then
            npm run preview
        else
            echo "❌ dist目录不存在，请先构建项目"
            exit 1
        fi
        ;;
    4)
        echo ""
        echo "🔍 类型检查..."
        npm run type-check
        ;;
    5)
        echo ""
        echo "🧹 代码检查..."
        npm run lint
        ;;
    6)
        echo "👋 再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac
