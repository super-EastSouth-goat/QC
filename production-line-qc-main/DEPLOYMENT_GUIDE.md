# 🚀 生产环境部署指南

## 安全修复说明

本次更新修复了严重的安全漏洞：
- ✅ 移除前端的 `client_secret` 暴露
- ✅ Token 交换移至服务端 API
- ✅ 使用 OIDC Discovery 获取正确端点
- ✅ 使用公网域名替代内网 IP

## 部署步骤

### 1. 在生产服务器上拉取最新代码

```bash
cd /path/to/production-line-qc
git pull origin main
```

### 2. 配置生产环境变量

创建 `.env.production` 文件（如果不存在）：

```bash
cp .env.production.example .env.production
```

编辑 `.env.production`，确保包含以下配置：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://djlgzajaagvykkabpuem.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbGd6YWphYWd2eWtrYWJwdWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjY5ODIsImV4cCI6MjA4MzQwMjk4Mn0.SylBv5h0TAxLwTHXCw95knJMaDMXlXrHWfBcxCDg5GA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbGd6YWphYWd2eWtrYWJwdWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzgyNjk4MiwiZXhwIjoyMDgzNDAyOTgyfQ.zL74JC5i_jLzfLGqtCcXqp8efHgJBuyZDASlmTDGJKo

# Enterprise OIDC Configuration (服务端专用)
ENTERPRISE_OIDC_ISSUER=https://panovation.i234.me:5001/webman/sso
ENTERPRISE_OIDC_CLIENT_ID=fd1297925826a23aed846c170a33fcbc
ENTERPRISE_OIDC_CLIENT_SECRET=REGRxUmocD8eIeGnULJtysKWPi3WW8LT

# Edge API Configuration
EDGE_API_URL=

# Environment
NODE_ENV=production
```

**⚠️ 重要**: 
- 确保 `.env.production` 文件权限正确：`chmod 600 .env.production`
- **不需要** 设置 `NEXT_PUBLIC_SITE_URL` 或 `NEXTAUTH_URL`，代码会自动从请求头获取

### 2.1 更新 OIDC 回调 URL

在你的 OIDC 服务器（https://221.226.60.30:5001）中，更新回调 URL 为：

```
开发环境: http://localhost:3000/auth/oidc-callback
生产环境: http://69.230.223.12:3110/auth/oidc-callback
```

**注意**: 回调 URL 从 `/auth/callback` 改为 `/auth/oidc-callback`

### 3. 安装依赖（如果有新依赖）

```bash
npm ci
```

### 4. 构建生产版本

```bash
npm run build
```

### 5. 重启 Next.js 服务

如果使用 PM2：

```bash
pm2 restart production-line-qc
```

如果使用其他方式：

```bash
# 停止当前服务
pkill -f "next start"

# 启动新服务
npm run start
```

或者如果使用 systemd：

```bash
sudo systemctl restart production-line-qc
```

### 6. 验证部署

访问生产环境：http://69.230.223.12:3110/auth/login

#### 验证清单

1. **点击 "使用企业 OIDC 登录"**
   - ✅ 浏览器应跳转到 `https://panovation.i234.me:5001/...SSOOauth.cgi?...`
   - ❌ 不应出现 `221.226.60.30` 或 `/authorize`

2. **检查 Network 面板（F12）**
   - ✅ 应该看到 `/api/oidc/exchange` 请求
   - ❌ 不应看到任何包含 `client_secret` 的请求

3. **登录成功**
   - ✅ 能获取用户信息（email/sub）
   - ✅ 自动创建 Supabase 账户
   - ✅ 重定向到首页

## 故障排除

### 问题 1: 环境变量未生效

**症状**: 仍然使用旧的内网地址

**解决**:
```bash
# 检查环境变量
cat .env.production

# 确保构建时使用了正确的环境变量
rm -rf .next
npm run build
pm2 restart production-line-qc
```

### 问题 2: API 路由 404

**症状**: `/api/oidc/exchange` 返回 404

**解决**:
```bash
# 确保文件存在
ls -la src/app/api/oidc/exchange/route.ts

# 重新构建
npm run build
pm2 restart production-line-qc
```

### 问题 3: Discovery 失败

**症状**: "无法获取 OIDC 配置"

**解决**:
```bash
# 测试 discovery 端点
curl https://panovation.i234.me:5001/webman/sso/.well-known/openid-configuration

# 如果 SSL 证书问题，可能需要配置 NODE_TLS_REJECT_UNAUTHORIZED=0（仅开发环境）
```

### 问题 4: Token 交换失败

**症状**: "Token exchange failed"

**解决**:
1. 检查服务器日志：`pm2 logs production-line-qc`
2. 确认 `client_secret` 正确
3. 确认回调 URL 在 OIDC 服务器中已配置

## 安全检查

部署后，确认以下安全措施：

- [ ] `.env.production` 文件权限为 600
- [ ] `client_secret` 不在前端代码中
- [ ] Network 面板中没有暴露 `client_secret`
- [ ] Token 交换只在服务端进行
- [ ] 使用公网域名而非内网 IP

## 回滚方案

如果部署出现问题，可以回滚到上一个版本：

```bash
git log --oneline -5  # 查看最近的 commits
git checkout <previous-commit-hash>
npm run build
pm2 restart production-line-qc
```

## 监控

部署后监控以下指标：

```bash
# 查看应用日志
pm2 logs production-line-qc

# 查看应用状态
pm2 status

# 查看内存使用
pm2 monit
```

## 下一步

- [ ] 配置 HTTPS（使用 Let's Encrypt 或 Nginx 反向代理）
- [ ] 设置日志监控和告警
- [ ] 配置自动备份
- [ ] 性能优化和缓存策略
