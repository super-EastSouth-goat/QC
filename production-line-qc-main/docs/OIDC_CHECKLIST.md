# OIDC 配置清单

## 你的 OIDC 服务器信息

- **服务器地址**: `https://221.226.60.30:5001/webman/sso`
- **Discovery URL**: `https://221.226.60.30:5001/webman/sso/.well-known/openid-configuration`

## 配置步骤

### 1. 从 OIDC 管理员获取信息 ✅

需要获取以下信息：

- [ ] **Client ID** (应用程序标识符)
- [ ] **Client Secret** (应用程序密钥)
- [ ] **支持的 Scopes** (通常是 `openid profile email`)
- [ ] **用户信息字段映射** (email, name, department 等)

### 2. 配置重定向 URL ✅

请 OIDC 管理员将以下 URL 添加到重定向白名单：

```
开发环境: http://localhost:3000/auth/callback
生产环境: https://your-production-domain.com/auth/callback
```

### 3. 配置 Supabase ✅

在 Supabase 控制台 → Authentication → Providers → OpenID Connect：

```
Provider Name: oidc
Client ID: [从步骤1获取]
Client Secret: [从步骤1获取]
Issuer URL: https://221.226.60.30:5001/webman/sso
Additional Scopes: openid profile email
```

### 4. 更新环境变量 ✅

更新 `.env.local` 文件：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. 测试登录流程 ✅

1. 启动开发服务器: `npm run dev`
2. 访问: `http://localhost:3000/auth/login`
3. 点击 "使用企业 OIDC 登录"
4. 验证重定向到企业登录页面
5. 登录后验证重定向回应用

## 常见问题排查

### SSL 证书问题
如果遇到 SSL 证书错误：
- 确认 OIDC 服务器使用有效证书
- 或在 Supabase 配置中处理自签名证书

### 重定向 URL 不匹配
- 确认 OIDC 服务器中配置的重定向 URL 完全匹配
- 检查是否包含端口号

### Client ID/Secret 错误
- 验证从 OIDC 管理员获取的凭据
- 确认在 Supabase 中正确配置

## 联系信息

如需帮助，请联系：
- **OIDC 管理员**: [获取 Client ID/Secret 和配置重定向 URL]
- **Supabase 支持**: [配置 OpenID Connect 提供商]

## 下一步

配置完成后，用户可以：
1. 使用企业账户登录质检系统
2. 自动获取用户信息和权限
3. 无需单独注册账户