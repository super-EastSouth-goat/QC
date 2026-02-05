# Supabase OIDC 配置 - 替代方案

## 如果在 Supabase Dashboard 找不到 OIDC 选项

### 方案 1: 联系 Supabase 支持

发送邮件到 support@supabase.com 或在 Dashboard 中使用支持聊天，请求启用 OIDC provider。

提供以下信息：
- Project ID: `djlgzajaagvykkabpuem`
- 需要启用: OpenID Connect (OIDC) provider
- Issuer URL: `https://221.226.60.30:5001/webman/sso`

### 方案 2: 使用 Supabase Management API

如果你有 Supabase 管理权限，可以通过 API 配置：

```bash
curl -X POST 'https://api.supabase.com/v1/projects/djlgzajaagvykkabpuem/config/auth' \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "EXTERNAL_OIDC_ENABLED": true,
    "EXTERNAL_OIDC_CLIENT_ID": "fd1297925826a23aed846c170a33fcbc",
    "EXTERNAL_OIDC_SECRET": "REGRxUmocD8eIeGnULJtysKWPi3WW8LT",
    "EXTERNAL_OIDC_ISSUER": "https://221.226.60.30:5001/webman/sso"
  }'
```

### 方案 3: 检查 Supabase 计划

OIDC 可能需要特定的 Supabase 计划：
- **Free Plan**: 可能不支持所有 third-party providers
- **Pro Plan**: 支持所有 providers 包括 OIDC
- **Enterprise Plan**: 完整支持

检查你的计划: Dashboard → Settings → Billing

## 当前可用的 Third-party Providers

在 Supabase Dashboard 中，你应该能看到这些 providers：

### 常见的 Providers
- Google
- GitHub
- GitLab
- Bitbucket
- Azure (Microsoft)
- Facebook
- Twitter
- Discord
- Slack
- Spotify
- Twitch
- LinkedIn
- **OpenID Connect** (OIDC) ← 你需要的

如果列表中没有 OpenID Connect，说明可能需要升级计划或联系支持。

## 临时解决方案：使用 Azure AD

如果你的 OIDC 服务器兼容 Azure AD 协议，可以尝试使用 Azure provider：

1. 在 Providers 中找到 **Azure**
2. 配置类似的参数
3. 测试是否能工作

但这不是推荐方案，最好还是使用标准的 OIDC。
