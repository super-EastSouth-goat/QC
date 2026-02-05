# 快速启动指南

## 🚀 5 分钟设置数据库

### 第一步：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 并登录
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: `production-line-qc`
   - **Database Password**: 设置强密码
   - **Region**: 选择 Singapore 或 Tokyo
4. 等待项目创建完成（2-3 分钟）

### 第二步：获取配置信息

1. 在项目 Dashboard 中，点击 "Settings" → "API"
2. 复制以下信息：
   - **Project URL**
   - **anon public key**
   - **service_role secret key**

### 第三步：配置环境变量

创建 `.env.local` 文件：

```bash
# 复制 .env.local.example 到 .env.local
cp .env.local.example .env.local

# 编辑 .env.local，替换为你的 Supabase 信息
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 第四步：创建存储桶

1. 在 Supabase Dashboard 中，点击 "Storage"
2. 点击 "Create a new bucket"
3. 设置：
   - **Name**: `qc-images`
   - **Public bucket**: 取消勾选
   - **File size limit**: `10 MB`

### 第五步：执行数据库脚本

在 Supabase Dashboard → SQL Editor 中，按顺序执行：

1. **复制并执行** `database/01_initial_schema.sql`
2. **复制并执行** `database/02_rls_policies.sql`
3. **复制并执行** `database/03_storage_setup.sql`
4. **复制并执行** `database/04_performance_optimizations.sql`（推荐）

### 第六步：验证设置

```bash
# 验证数据库配置
npm run verify-database

# 如果验证通过，启动应用
npm run dev
```

### 第七步：测试应用

访问 `http://localhost:3000`

✅ **成功标志**：看到真实的登录界面，而不是 "Demo 模式" 提示

## 🔧 故障排除

### 问题：仍然显示 Demo 模式
**解决方案**：
- 检查 `.env.local` 文件配置
- 重启开发服务器 (`Ctrl+C` 然后 `npm run dev`)

### 问题：数据库连接失败
**解决方案**：
- 验证 Supabase URL 和 API Key
- 确认 Supabase 项目状态正常

### 问题：表不存在错误
**解决方案**：
- 确认已执行所有数据库脚本
- 检查 SQL 执行是否有错误

## 📞 需要帮助？

运行验证脚本获取详细诊断：

```bash
npm run verify-database
```

查看详细文档：
- `docs/DATABASE_SETUP_GUIDE.md` - 完整设置指南
- `docs/OIDC_SETUP.md` - 企业登录配置
- `database/README.md` - 数据库架构说明