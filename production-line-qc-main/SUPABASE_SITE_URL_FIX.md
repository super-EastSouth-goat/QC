# Supabase 站点URL配置修复指南

## 问题描述
注册邮件中的确认链接指向 `localhost:3000` 而不是生产环境URL `http://69.230.223.12:3110`。

## 解决方案

### 1. 更新环境变量
在 `.env.local` 和 `.env.production` 中添加：
```bash
NEXT_PUBLIC_SITE_URL=http://69.230.223.12:3110
```

### 2. 配置Supabase项目设置
登录 [Supabase Dashboard](https://supabase.com/dashboard) 并进行以下配置：

#### A. 更新站点URL
1. 进入项目 → Settings → General
2. 找到 "Site URL" 设置
3. 将值从 `http://localhost:3000` 更改为 `http://69.230.223.12:3110`
4. 点击 "Save" 保存

#### B. 配置重定向URL
1. 进入项目 → Authentication → URL Configuration
2. 在 "Redirect URLs" 中添加以下URL：
   ```
   http://69.230.223.12:3110/auth/callback
   http://69.230.223.12:3110/auth/login
   http://69.230.223.12:3110/auth/reset-password
   http://69.230.223.12:3110/auth/enterprise-callback
   ```
3. 点击 "Save" 保存

#### C. 邮件模板配置（可选）
1. 进入项目 → Authentication → Email Templates
2. 检查 "Confirm signup" 模板
3. 确认 `{{ .ConfirmationURL }}` 使用正确的域名

### 3. 代码修改（已完成）
- ✅ 更新 `signUp` 函数添加 `emailRedirectTo` 配置
- ✅ 更新 `signInWithMagicLink` 函数使用正确的站点URL
- ✅ 更新 `resetPasswordForEmail` 函数使用正确的重定向URL
- ✅ 添加邮箱确认成功后的提示消息
- ✅ 注册成功后显示邮箱确认提示

### 4. 验证步骤
部署后进行以下测试：

1. **注册新用户**：
   - 访问 `http://69.230.223.12:3110/auth/login`
   - 切换到"注册"模式
   - 输入邮箱和密码
   - 点击"注册"
   - 应该显示："注册成功！请检查您的邮箱并点击确认链接来激活账户。"

2. **检查确认邮件**：
   - 邮件中的确认链接应该指向 `http://69.230.223.12:3110/auth/login?message=email_confirmed`
   - 而不是 `localhost:3000`

3. **点击确认链接**：
   - 应该跳转到登录页面
   - 显示："邮箱验证成功！您现在可以登录了。"

4. **使用新账户登录**：
   - 输入注册时的邮箱和密码
   - 应该能够成功登录

### 5. 忘记密码流程验证
1. 在登录页点击"忘记密码？"
2. 输入邮箱地址
3. 重置邮件中的链接应该指向 `http://69.230.223.12:3110/auth/reset-password`

## 部署命令
```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm ci

# 构建项目
npm run build

# 重启服务
pm2 restart production-line-qc
```

## 注意事项
- 确保生产环境的 `.env.production` 文件包含正确的 `NEXT_PUBLIC_SITE_URL`
- Supabase配置更改可能需要几分钟才能生效
- 如果仍有问题，可以在Supabase Dashboard的Logs中查看详细错误信息