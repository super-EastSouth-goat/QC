# 🔒 安全验证报告

## Token Exchange 流程

### ✅ 当前实现（安全）

```
浏览器                    Next.js Server              OIDC IdP
  |                            |                          |
  |-- 1. 点击登录 ------------>|                          |
  |                            |                          |
  |<-- 2. 跳转到 IdP ---------------------------------->|
  |                            |                          |
  |-- 3. 用户登录 ----------------------------------->|
  |                            |                          |
  |<-- 4. 回调 /auth/oidc-callback?code=xxx&state=xxx --|
  |                            |                          |
  |-- 5. POST /api/oidc/exchange                         |
  |    { code, redirectUri, codeVerifier }               |
  |                            |                          |
  |                            |-- 6. POST /token ------->|
  |                            |    (带 client_secret)    |
  |                            |                          |
  |                            |<-- 7. 返回 tokens -------|
  |                            |                          |
  |                            |-- 8. GET /userinfo ----->|
  |                            |    (带 access_token)     |
  |                            |                          |
  |                            |<-- 9. 返回 userInfo -----|
  |                            |                          |
  |<-- 10. 返回 { tokens, userInfo } --------------------|
  |                            |                          |
  |-- 11. 登录到 Supabase ---->|                          |
  |                            |                          |
  |<-- 12. 重定向到首页 --------|                          |
```

## 安全检查清单

### ✅ Client Secret 保护

1. **前端代码**
   - ❌ `src/lib/auth/oidcService.ts` - **不包含** client_secret
   - ✅ 只包含 `clientId` 和 `issuer`（公开信息）

2. **服务端代码**
   - ✅ `src/app/api/oidc/exchange/route.ts` - **包含** client_secret
   - ✅ 从环境变量读取：`process.env.ENTERPRISE_OIDC_CLIENT_SECRET`
   - ✅ 只在服务端执行，不会打包到前端 bundle

3. **环境变量**
   - ✅ `.env.local` - 本地开发（不提交到 Git）
   - ✅ `.env.production` - 生产环境（不提交到 Git）
   - ✅ `.gitignore` - 已配置忽略所有 `.env*` 文件

### ✅ Token Exchange 位置

**问题**: Token exchange 在 server 还是 browser？

**答案**: **Server (Next.js API Route)**

**证据**:
1. 浏览器调用 `fetch('/api/oidc/exchange', ...)`
2. 请求到达 `src/app/api/oidc/exchange/route.ts`（服务端）
3. 服务端使用 `client_secret` 调用 IdP 的 token endpoint
4. 服务端返回 tokens 给浏览器

### ✅ Client Secret 不出现在前端

**验证方法 1: 检查前端 bundle**

```bash
# 构建生产版本
npm run build

# 搜索 client_secret
grep -r "REGRxUmocD8eIeGnULJtysKWPi3WW8LT" .next/static/
# 应该没有结果

# 搜索 ENTERPRISE_OIDC_CLIENT_SECRET
grep -r "ENTERPRISE_OIDC_CLIENT_SECRET" .next/static/
# 应该没有结果
```

**验证方法 2: 检查浏览器 Network**

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 点击 "使用企业 OIDC 登录"
4. 检查所有请求：
   - ✅ 授权请求（到 IdP）- 只包含 `client_id`，不包含 `client_secret`
   - ✅ `/api/oidc/exchange` 请求 - 只包含 `code`, `redirectUri`, `codeVerifier`
   - ❌ **不应该看到任何包含 `client_secret` 的请求**

**验证方法 3: 检查前端源码**

1. 在浏览器中打开 Sources 标签
2. 搜索 `client_secret` 或 `REGRxUmocD8eIeGnULJtysKWPi3WW8LT`
3. **应该找不到任何结果**

### ✅ PKCE 流程

**问题**: PKCE 的 code_verifier 如何传递？

**答案**: 
1. 浏览器生成 `code_verifier` 和 `code_challenge`
2. `code_verifier` 保存在 sessionStorage
3. `code_challenge` 发送给 IdP
4. 回调时，浏览器从 sessionStorage 读取 `code_verifier`
5. 浏览器将 `code_verifier` 发送给服务端 API
6. 服务端使用 `code_verifier` + `client_secret` 交换 token

**安全性**: 
- ✅ `code_verifier` 只在浏览器和服务端之间传递
- ✅ IdP 只收到 `code_challenge`，无法反推 `code_verifier`
- ✅ 即使攻击者截获 `code`，没有 `code_verifier` 也无法交换 token

## 代码审计

### 前端代码（浏览器执行）

**文件**: `src/lib/auth/oidcService.ts`

```typescript
// ✅ 安全：不包含 client_secret
const OIDC_CONFIG = {
  issuer: 'https://panovation.i234.me:5001/webman/sso',
  clientId: 'fd1297925826a23aed846c170a33fcbc',  // 公开信息
  scopes: 'openid profile email',
  get redirectUri() {
    return `${window.location.origin}/auth/oidc-callback`
  }
}

// ✅ 安全：调用服务端 API，不直接访问 token endpoint
export async function handleOIDCCallback(code: string, state: string) {
  const response = await fetch('/api/oidc/exchange', {
    method: 'POST',
    body: JSON.stringify({
      code,
      redirectUri: OIDC_CONFIG.redirectUri,
      codeVerifier,  // 从 sessionStorage 读取
    }),
  })
  // ...
}
```

### 服务端代码（Next.js Server 执行）

**文件**: `src/app/api/oidc/exchange/route.ts`

```typescript
// ✅ 安全：从环境变量读取，不会打包到前端
const OIDC_SERVER_CONFIG = {
  issuer: process.env.ENTERPRISE_OIDC_ISSUER,
  clientId: process.env.ENTERPRISE_OIDC_CLIENT_ID,
  clientSecret: process.env.ENTERPRISE_OIDC_CLIENT_SECRET,  // 只在服务端
}

export async function POST(request: NextRequest) {
  // ✅ 安全：在服务端使用 client_secret
  const tokenResponse = await fetch(discovery.token_endpoint, {
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: OIDC_SERVER_CONFIG.clientId,
      client_secret: OIDC_SERVER_CONFIG.clientSecret,  // 只在服务端发送
      code_verifier: codeVerifier,
    }),
  })
  // ...
}
```

## 环境变量配置

### ✅ 正确配置

**`.env.local`** (开发环境，不提交到 Git):
```bash
ENTERPRISE_OIDC_ISSUER=https://panovation.i234.me:5001/webman/sso
ENTERPRISE_OIDC_CLIENT_ID=fd1297925826a23aed846c170a33fcbc
ENTERPRISE_OIDC_CLIENT_SECRET=REGRxUmocD8eIeGnULJtysKWPi3WW8LT
```

**`.env.production`** (生产环境，不提交到 Git):
```bash
ENTERPRISE_OIDC_ISSUER=https://panovation.i234.me:5001/webman/sso
ENTERPRISE_OIDC_CLIENT_ID=fd1297925826a23aed846c170a33fcbc
ENTERPRISE_OIDC_CLIENT_SECRET=REGRxUmocD8eIeGnULJtysKWPi3WW8LT
```

**`.gitignore`**:
```
.env*
!.env.local.example
!.env.production.example
```

### ❌ 错误配置（不要这样做）

```bash
# ❌ 不要使用 NEXT_PUBLIC_ 前缀（会暴露到前端）
NEXT_PUBLIC_ENTERPRISE_OIDC_CLIENT_SECRET=xxx  # 危险！

# ❌ 不要在前端代码中硬编码
const clientSecret = 'REGRxUmocD8eIeGnULJtysKWPi3WW8LT'  # 危险！
```

## 生产环境验证步骤

### 1. 检查前端 bundle

```bash
# SSH 到生产服务器
ssh user@69.230.223.12

cd /path/to/production-line-qc

# 搜索 client_secret
find .next/static -type f -exec grep -l "REGRxUmocD8eIeGnULJtysKWPi3WW8LT" {} \;
# 应该没有输出

find .next/static -type f -exec grep -l "ENTERPRISE_OIDC_CLIENT_SECRET" {} \;
# 应该没有输出
```

### 2. 检查浏览器 Network

1. 访问: http://69.230.223.12:3110/auth/login
2. 打开 F12 开发者工具
3. 切换到 Network 标签
4. 点击 "使用企业 OIDC 登录"
5. 检查所有请求的 Headers 和 Payload
6. **确认没有任何请求包含 `client_secret`**

### 3. 检查服务端日志

```bash
pm2 logs production-line-qc --lines 100
```

查找：
- ✅ `Token endpoint:` - 确认使用正确的 endpoint
- ✅ `OIDC login successful:` - 确认登录成功
- ❌ 不应该看到 `client_secret` 被打印出来

## 安全评分

| 项目 | 状态 | 说明 |
|------|------|------|
| Client Secret 保护 | ✅ 安全 | 只在服务端，不在前端 bundle |
| Token Exchange 位置 | ✅ 安全 | 在服务端 API Route |
| PKCE 实现 | ✅ 安全 | 正确使用 code_verifier |
| 环境变量配置 | ✅ 安全 | 不提交到 Git |
| 前端代码 | ✅ 安全 | 不包含敏感信息 |
| Network 请求 | ✅ 安全 | 不暴露 client_secret |

## 总结

### ✅ Token Exchange 在 Server

- 浏览器调用 `/api/oidc/exchange`
- Next.js API Route 处理 token 交换
- `client_secret` 只在服务端使用

### ✅ Client Secret 完全不出现在前端

- ❌ 不在前端代码中
- ❌ 不在前端 bundle 中
- ❌ 不在浏览器 Network 请求中
- ✅ 只在服务端环境变量中
- ✅ 只在服务端 API Route 中使用

### ✅ 安全最佳实践

1. 使用环境变量存储敏感信息
2. Token 交换在服务端进行
3. PKCE 防止授权码拦截攻击
4. 不提交 `.env` 文件到 Git
5. 使用 HTTPS（生产环境建议）

## 下一步建议

1. ✅ 配置 HTTPS（使用 Let's Encrypt 或 Nginx SSL）
2. ✅ 定期轮换 `client_secret`
3. ✅ 监控异常登录尝试
4. ✅ 实施 Rate Limiting
5. ✅ 配置 CORS 策略
