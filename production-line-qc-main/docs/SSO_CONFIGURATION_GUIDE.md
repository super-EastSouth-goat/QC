# SSO 配置完整指南 - 直接 OIDC 集成

## ✅ 已实现：直接 OIDC 登录

由于 Supabase 免费版不支持自定义 OIDC provider，我们实现了**直接 OIDC 集成**方案：
- 前端直接与你的 OIDC 服务器通信
- 获取用户信息后自动创建/登录 Supabase 账户
- 无需 Supabase third-party auth 配置

## 你的 SSO 配置信息

### 应用信息
- **应用名称**: Production-Line-QC
- **生产环境 URL**: http://69.230.223.12:3110
- **登录页面**: http://69.230.223.12:3110/auth/login

### OIDC 服务器信息
- **OIDC 服务器**: https://221.226.60.30:5001/webman/sso
- **Discovery URL**: https://221.226.60.30:5001/webman/sso/.well-known/openid-configuration
- **Client ID**: `fd1297925826a23aed846c170a33fcbc`
- **Client Secret**: `REGRxUmocD8eIeGnULJtysKWPi3WW8LT`

### 回调 URL
- **开发环境**: `http://localhost:3000/auth/callback`
- **生产环境**: `http://69.230.223.12:3110/auth/callback`

---

## 步骤 1: 在 OIDC 服务器配置回调 URL（必需）

### 1.1 登录你的 OIDC 管理后台

访问: https://221.226.60.30:5001/webman/sso

### 1.2 找到应用 "Production-Line-QC"

Client ID: `fd1297925826a23aed846c170a33fcbc`

### 1.3 添加重定向 URI (Redirect URIs)

在应用配置中添加以下回调 URL：

```
开发环境: http://localhost:3000/auth/callback
生产环境: http://69.230.223.12:3110/auth/callback
```

**重要**: 两个 URL 都要添加，这样开发和生产环境都能正常工作。

### 1.4 确认其他设置

- **Grant Types**: 确保启用 `authorization_code`
- **Response Types**: 确保启用 `code`
- **Token Endpoint Auth Method**: 通常是 `client_secret_post` 或 `client_secret_basic`
- **PKCE**: 如果支持，建议启用（我们的代码已支持 PKCE）

---

## 步骤 2: 代码已配置完成 ✅

以下代码已自动配置：

### 2.1 OIDC 登录服务
- 文件: `src/lib/auth/oidcService.ts`
- 功能: 直接与 OIDC 服务器通信，处理授权流程

### 2.2 登录表单
- 文件: `src/components/auth/LoginForm.tsx`
- 功能: "使用企业 OIDC 登录" 按钮

### 2.3 回调处理
- 文件: `src/app/auth/callback/route.ts`
- 功能: 处理 OIDC 回调，自动创建 Supabase 用户

---

## 步骤 3: 测试 SSO 登录

### 3.1 访问登录页面

开发环境: http://localhost:3000/auth/login
生产环境: http://69.230.223.12:3110/auth/login

### 3.2 点击 "使用企业 OIDC 登录"

系统会重定向到你的 OIDC 服务器登录页面。

### 3.3 输入企业账号密码

在 OIDC 服务器页面输入你的企业账号和密码。

### 3.4 授权并重定向

- 授权后会重定向回: `http://69.230.223.12:3110/auth/callback?code=xxx&state=xxx`
- 系统自动处理授权码交换
- 获取用户信息并创建/登录 Supabase 账户
- 登录成功后重定向到首页

### 3.5 验证登录状态

登录成功后，你应该能看到：
- 用户邮箱显示在界面上
- 可以访问质检功能
- 可以查看历史记录

---

## 登录流程说明

### 完整流程

1. **用户点击 "使用企业 OIDC 登录"**
   - 前端生成 state、nonce 和 PKCE 参数
   - 保存到 sessionStorage
   - 重定向到 OIDC 授权页面

2. **用户在 OIDC 服务器登录**
   - 输入企业账号密码
   - OIDC 服务器验证身份

3. **OIDC 重定向回应用**
   - 携带授权码 (code) 和 state
   - URL: `/auth/callback?code=xxx&state=xxx`

4. **应用处理回调**
   - 验证 state 参数
   - 使用授权码交换 access_token 和 id_token
   - 调用 userinfo 端点获取用户信息

5. **创建/登录 Supabase 账户**
   - 使用 OIDC 用户的 email 创建 Supabase 账户
   - 自动创建 profile 记录
   - 设置 session

6. **重定向到首页**
   - 用户已登录状态
   - 可以使用所有功能

---

## 故障排除

### 问题 1: 重定向 URI 不匹配

**错误信息**: `redirect_uri_mismatch` 或 `invalid_redirect_uri`

**解决方案**:
1. 检查 OIDC 服务器中配置的回调 URL 是否完全匹配
2. 确保 URL 包含 `/auth/callback` 路径
3. 检查是否有多余的斜杠或空格

### 问题 2: Client ID/Secret 错误

**错误信息**: `invalid_client` 或 `unauthorized_client`

**解决方案**:
1. 重新检查 Supabase 中的 Client ID 和 Secret
2. 确保没有复制多余的空格
3. 确认 OIDC 服务器中的应用状态是"启用"

### 问题 3: SSL 证书问题

**错误信息**: `SSL certificate problem` 或 `unable to verify`

**解决方案**:
- 你的 OIDC 服务器使用自签名证书 (https://221.226.60.30:5001)
- 可能需要在 Supabase 配置中添加证书信任
- 或者联系 OIDC 管理员使用有效的 SSL 证书

### 问题 4: 用户 Profile 未创建

**错误信息**: 登录成功但一直显示 loading

**解决方案**:
1. 检查数据库中是否有 `profiles` 表
2. 确认已执行 `database/06_auto_profile_creation.sql`
3. 手动创建 profile:

```sql
INSERT INTO profiles (id, role, station)
VALUES ('user-id-from-auth', 'worker', NULL);
```

### 问题 5: CORS 错误

**错误信息**: `CORS policy` 或 `Access-Control-Allow-Origin`

**解决方案**:
1. 确保 OIDC 服务器允许来自你域名的请求
2. 检查 Supabase 项目的 CORS 配置
3. 确认生产环境 URL 配置正确

---

## 调试工具

### 查看认证状态

访问调试页面: http://69.230.223.12:3110/debug-auth

这个页面会显示：
- 当前用户信息
- Profile 数据
- Session 状态
- 数据库连接状态

### 查看浏览器控制台

按 F12 打开开发者工具，查看：
- Network 标签: 查看 OIDC 请求和响应
- Console 标签: 查看错误日志
- Application 标签: 查看 Cookies 和 LocalStorage

### 查看 Supabase 日志

在 Supabase 控制台:
1. 进入 **Authentication** → **Logs**
2. 查看最近的登录尝试
3. 检查是否有错误信息

---

## 安全注意事项

### ⚠️ HTTP vs HTTPS

你的生产环境使用 HTTP (http://69.230.223.12:3110)，这在生产环境中**不安全**。

**建议**:
1. 配置 HTTPS (使用 Let's Encrypt 免费证书)
2. 或者使用反向代理 (Nginx/Caddy) 添加 SSL
3. 更新回调 URL 为 HTTPS

### 🔒 保护敏感信息

- **不要**在前端代码中暴露 Client Secret
- **不要**在 Git 中提交 `.env.local` 文件
- **定期轮换** Client Secret

### 🛡️ 生产环境检查清单

- [ ] 启用 HTTPS
- [ ] 配置防火墙规则
- [ ] 启用 Supabase RLS (Row Level Security)
- [ ] 配置日志监控
- [ ] 设置备份策略
- [ ] 限制 CORS 来源
- [ ] 配置 Rate Limiting

---

## 下一步

配置完成后，你可以：

1. **配置角色映射**: 参考 `docs/SSO_ROLE_MAPPING.md`
2. **测试完整流程**: 参考 `docs/OIDC_TEST_GUIDE.md`
3. **配置 HTTPS**: 提升安全性
4. **监控和日志**: 设置生产环境监控

---

## 需要帮助？

如果遇到问题：
1. 查看本文档的"故障排除"部分
2. 检查 Supabase 认证日志
3. 查看浏览器控制台错误
4. 访问调试页面: `/debug-auth`
