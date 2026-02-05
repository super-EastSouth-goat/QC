# SSO 设置检查清单

## ✅ 已完成的配置

### 1. 代码配置 ✅
- [x] 创建 OIDC 登录服务 (`src/lib/auth/oidcService.ts`)
- [x] 更新登录表单 (`src/components/auth/LoginForm.tsx`)
- [x] 更新回调处理 (`src/app/auth/callback/route.ts`)
- [x] 配置 OIDC 参数（Client ID, Secret, Issuer URL）

### 2. 你的 OIDC 配置信息
```
Client ID: fd1297925826a23aed846c170a33fcbc
Client Secret: REGRxUmocD8eIeGnULJtysKWPi3WW8LT
Issuer URL: https://221.226.60.30:5001/webman/sso
```

---

## 🔧 需要你完成的配置

### 步骤 1: 在 OIDC 服务器添加回调 URL

1. 登录你的 OIDC 管理后台: https://221.226.60.30:5001/webman/sso

2. 找到应用 "Production-Line-QC" (Client ID: `fd1297925826a23aed846c170a33fcbc`)

3. 在 **Redirect URIs** 或 **回调 URL** 设置中添加：
   ```
   http://localhost:3000/auth/callback
   http://69.230.223.12:3110/auth/callback
   ```

4. 确认以下设置：
   - ✅ Grant Types: `authorization_code`
   - ✅ Response Types: `code`
   - ✅ Scopes: `openid profile email`

5. 保存配置

---

## 🧪 测试步骤

### 本地测试（开发环境）

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **访问登录页面**
   ```
   http://localhost:3000/auth/login
   ```

3. **点击 "使用企业 OIDC 登录"**
   - 应该重定向到: `https://221.226.60.30:5001/webman/sso/authorize?...`

4. **输入企业账号密码**
   - 在 OIDC 服务器页面登录

5. **验证回调**
   - 应该重定向回: `http://localhost:3000/auth/callback?code=xxx&state=xxx`
   - 自动处理并跳转到首页

6. **检查登录状态**
   - 查看是否显示用户邮箱
   - 访问: `http://localhost:3000/debug-auth` 查看详细信息

### 生产环境测试

1. **部署代码到生产服务器**
   ```bash
   git add .
   git commit -m "Add direct OIDC integration"
   git push origin main
   ```

2. **重启生产服务**
   ```bash
   # 在生产服务器上
   npm run build
   pm2 restart production-line-qc
   ```

3. **访问生产登录页面**
   ```
   http://69.230.223.12:3110/auth/login
   ```

4. **测试 OIDC 登录**
   - 点击 "使用企业 OIDC 登录"
   - 完成登录流程
   - 验证功能正常

---

## 🐛 故障排除

### 问题 1: 重定向 URI 不匹配

**错误**: `redirect_uri_mismatch` 或 `invalid_redirect_uri`

**解决方案**:
1. 检查 OIDC 服务器中的回调 URL 是否完全匹配
2. 确保 URL 包含 `/auth/callback` 路径
3. 检查是否有多余的斜杠

### 问题 2: CORS 错误

**错误**: `CORS policy` 或 `Access-Control-Allow-Origin`

**解决方案**:
1. 确保 OIDC 服务器允许来自你域名的请求
2. 检查 OIDC 服务器的 CORS 配置
3. 如果是自签名证书，可能需要处理 SSL 验证

### 问题 3: Token 交换失败

**错误**: `Failed to exchange authorization code`

**解决方案**:
1. 检查 Client Secret 是否正确
2. 确认 OIDC 服务器的 token endpoint 可访问
3. 查看浏览器控制台的详细错误信息

### 问题 4: 用户信息获取失败

**错误**: `Failed to fetch user info`

**解决方案**:
1. 确认 OIDC 服务器的 userinfo endpoint 可访问
2. 检查 access_token 是否有效
3. 确认 scopes 包含 `profile` 和 `email`

---

## 📊 调试工具

### 1. 浏览器控制台
按 F12 打开开发者工具：
- **Console**: 查看错误日志
- **Network**: 查看 OIDC 请求和响应
- **Application**: 查看 sessionStorage 中的 state 和 nonce

### 2. 调试页面
访问: `http://localhost:3000/debug-auth` 或 `http://69.230.223.12:3110/debug-auth`

显示：
- 当前用户信息
- Profile 数据
- Session 状态

### 3. OIDC Discovery
测试 OIDC 服务器配置：
```bash
curl https://221.226.60.30:5001/webman/sso/.well-known/openid-configuration
```

应该返回 OIDC 配置信息，包括：
- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`

---

## 📝 下一步

配置完成后：

1. ✅ 测试本地登录
2. ✅ 测试生产环境登录
3. ✅ 配置用户角色映射（如果需要）
4. ✅ 配置 HTTPS（提升安全性）
5. ✅ 设置监控和日志

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看浏览器控制台错误
2. 访问 `/debug-auth` 页面
3. 检查 OIDC 服务器日志
4. 参考 `docs/SSO_CONFIGURATION_GUIDE.md` 详细文档
