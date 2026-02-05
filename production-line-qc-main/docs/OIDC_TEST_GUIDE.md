# OIDC 测试指南

## 测试环境配置

### 你的 OIDC 服务器信息
- **服务器**: https://221.226.60.30:5001/webman/sso
- **Discovery URL**: https://221.226.60.30:5001/webman/sso/.well-known/openid-configuration
- **回调 URL**: http://localhost:3000/auth/callback

## 测试步骤

### 第一步：获取 OIDC 配置信息

请联系你的 OIDC 管理员获取：
1. **Client ID** (应用程序 ID)
2. **Client Secret** (应用程序密钥)
3. **确认重定向 URL** 已添加到白名单

### 第二步：在 Supabase 中配置

1. 打开 Supabase Dashboard → Authentication → Providers
2. 启用 OpenID Connect
3. 填写配置：
   ```
   Provider Name: oidc
   Client ID: [从管理员获取]
   Client Secret: [从管理员获取]
   Issuer URL: https://221.226.60.30:5001/webman/sso
   Additional Scopes: openid profile email
   ```

### 第三步：测试登录流程

1. 访问 http://localhost:3000/auth/login
2. 点击 "使用企业 OIDC 登录"
3. 应该重定向到企业登录页面
4. 输入企业账户凭据
5. 登录成功后重定向回应用

## 预期的用户信息格式

OIDC 登录成功后，系统会接收类似这样的用户信息：

```json
{
  "sub": "user123",
  "email": "zhang.san@company.com", 
  "name": "张三",
  "preferred_username": "zhangsan",
  "groups": ["QC_Worker", "Production_Line_A"],
  "department": "质量部",
  "job_title": "质检员"
}
```

## 角色映射测试

### 测试不同角色的用户

创建以下测试用户来验证角色映射：

1. **普通工人**
   ```json
   {
     "email": "worker@company.com",
     "name": "工人张三", 
     "groups": ["QC_Worker"],
     "department": "生产部"
   }
   ```

2. **主管**
   ```json
   {
     "email": "supervisor@company.com",
     "name": "主管李四",
     "groups": ["QC_Supervisor"],
     "job_title": "班组长"
   }
   ```

3. **工程师**
   ```json
   {
     "email": "engineer@company.com", 
     "name": "工程师王五",
     "groups": ["QC_Engineer"],
     "department": "质量部"
   }
   ```

4. **管理员**
   ```json
   {
     "email": "admin@company.com",
     "name": "管理员赵六", 
     "groups": ["QC_Admin"],
     "job_title": "质量经理"
   }
   ```

## 故障排除

### 常见问题

1. **重定向 URL 不匹配**
   - 确认 OIDC 服务器中配置了 `http://localhost:3000/auth/callback`

2. **Client ID/Secret 错误**
   - 检查 Supabase 中的配置是否正确

3. **SSL 证书问题**
   - 如果是自签名证书，可能需要特殊处理

4. **Scopes 不足**
   - 确保请求了 `openid profile email` scopes

### 调试方法

1. **检查浏览器网络面板**
   - 查看重定向请求是否正确

2. **查看 Supabase 日志**
   - Authentication → Logs 查看错误信息

3. **测试 Discovery URL**
   - 访问 https://221.226.60.30:5001/webman/sso/.well-known/openid-configuration
   - 确认返回正确的配置信息

## 成功标志

测试成功的标志：
- ✅ 点击 OIDC 登录按钮后重定向到企业登录页面
- ✅ 企业登录成功后重定向回应用
- ✅ 用户信息正确显示在应用中
- ✅ 根据用户角色显示对应权限的功能

## 下一步

OIDC 登录测试成功后：
1. 配置自动角色映射
2. 测试不同角色的权限
3. 配置生产环境的 OIDC 设置