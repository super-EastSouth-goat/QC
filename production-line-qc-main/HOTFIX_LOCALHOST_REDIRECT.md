# 🔥 紧急修复：localhost 重定向问题

## 问题描述

OIDC 登录回调时，错误页面重定向到 `http://localhost:3110` 而不是生产环境地址。

## 根本原因

1. **服务端无法访问 sessionStorage**: PKCE 的 `code_verifier` 存储在浏览器 sessionStorage 中，服务端 route 无法访问
2. **Origin 获取错误**: 服务端使用 `request.url` 的 origin 可能是 `localhost`

## 解决方案

### 1. 使用客户端回调页面

创建 `/auth/oidc-callback` 客户端页面处理 OIDC 回调：
- ✅ 可以访问 sessionStorage 中的 `code_verifier`
- ✅ 在浏览器环境执行，origin 正确
- ✅ 直接调用 `/api/oidc/exchange` API

### 2. 修复 origin 获取逻辑

在服务端 route 中优先使用 `x-forwarded-host` 头：

```typescript
function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  
  return new URL(request.url).origin
}
```

## 部署步骤

### 1. 拉取最新代码

```bash
cd /path/to/production-line-qc
git pull origin main
```

### 2. 更新 OIDC 回调 URL

在 OIDC 服务器（https://221.226.60.30:5001）中，更新回调 URL：

**旧的**:
```
http://69.230.223.12:3110/auth/callback
```

**新的**:
```
http://69.230.223.12:3110/auth/oidc-callback
```

### 3. 重新构建和部署

```bash
npm ci
npm run build
pm2 restart production-line-qc
```

### 4. 验证修复

1. 访问: http://69.230.223.12:3110/auth/login
2. 点击 "使用企业 OIDC 登录"
3. 在 IdP 登录后，应该回到: `http://69.230.223.12:3110/auth/oidc-callback?code=...&state=...`
4. 自动处理并跳转到首页
5. **不应再出现** `http://localhost:3110` 的地址

## 修改的文件

1. **`src/app/auth/oidc-callback/page.tsx`** (新增)
   - 客户端回调处理页面
   - 可以访问 sessionStorage

2. **`src/app/auth/callback/route.ts`** (修改)
   - 简化为只处理 Supabase 标准回调
   - 修复 origin 获取逻辑

3. **`src/lib/auth/oidcService.ts`** (修改)
   - 回调 URL 改为 `/auth/oidc-callback`

## 技术细节

### 为什么需要客户端回调页面？

OIDC PKCE 流程：
1. 前端生成 `code_verifier` 和 `code_challenge`
2. `code_verifier` 保存在 sessionStorage
3. 授权后，IdP 返回 `code`
4. 需要用 `code` + `code_verifier` 交换 token

**问题**: 服务端 route 无法访问浏览器的 sessionStorage

**解决**: 使用客户端页面处理回调，可以访问 sessionStorage

### 为什么会出现 localhost？

Next.js 服务端渲染时，`request.url` 可能包含内部地址：
- 开发环境: `http://localhost:3110`
- 生产环境: 如果没有正确的反向代理头，也可能是 `localhost`

**解决**: 优先使用 `x-forwarded-host` 头获取真实域名

## 如果仍然有问题

### 检查反向代理配置

如果使用 Nginx，确保设置了正确的头：

```nginx
location / {
    proxy_pass http://localhost:3110;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 检查日志

```bash
pm2 logs production-line-qc --lines 100
```

查找：
- `Callback request:` - 查看 origin 和 forwardedHost
- `OIDC callback error:` - 查看具体错误

### 手动测试 API

```bash
# 测试 token exchange API
curl -X POST http://69.230.223.12:3110/api/oidc/exchange \
  -H "Content-Type: application/json" \
  -d '{"code":"test","redirectUri":"http://69.230.223.12:3110/auth/oidc-callback","codeVerifier":"test"}'
```

## 回滚方案

如果新版本有问题，回滚到上一个版本：

```bash
git log --oneline -5
git checkout <previous-commit>
npm run build
pm2 restart production-line-qc
```

## 总结

- ✅ 使用客户端页面处理 OIDC 回调
- ✅ 修复 origin 获取逻辑
- ✅ 更新回调 URL 为 `/auth/oidc-callback`
- ✅ 不需要修改 Nginx 配置（但建议检查）
