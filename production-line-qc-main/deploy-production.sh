#!/bin/bash

# 生产环境部署脚本
# 使用方法: bash deploy-production.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署生产环境..."

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 检查环境变量文件
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production 不存在，从示例文件创建..."
    cp .env.production.example .env.production
    echo "❗ 请编辑 .env.production 填入正确的配置，然后重新运行此脚本"
    exit 1
fi

# 3. 安装依赖
echo "📦 安装依赖..."
npm ci

# 4. 构建生产版本
echo "🔨 构建生产版本..."
npm run build

# 5. 重启服务
echo "🔄 重启服务..."
if command -v pm2 &> /dev/null; then
    pm2 restart production-line-qc || pm2 start npm --name "production-line-qc" -- start
else
    echo "⚠️  PM2 未安装，请手动重启服务"
    echo "运行: npm run start"
fi

echo "✅ 部署完成！"
echo ""
echo "验证步骤："
echo "1. 访问: http://69.230.223.12:3110/auth/login"
echo "2. 点击 '使用企业 OIDC 登录'"
echo "3. 检查浏览器地址栏应显示: https://panovation.i234.me:5001/..."
echo "4. 检查 Network 面板，确认 /api/oidc/exchange 请求成功"
echo ""
echo "查看日志: pm2 logs production-line-qc"
