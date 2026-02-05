# 数据库设置向导

## 第一步：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project"
3. 登录或注册账户
4. 点击 "New Project"
5. 填写项目信息：
   - **Name**: `production-line-qc`
   - **Database Password**: 设置一个强密码（记住这个密码）
   - **Region**: 选择离你最近的区域（建议选择 Singapore 或 Tokyo）
6. 点击 "Create new project"
7. 等待项目创建完成（约 2-3 分钟）

## 第二步：获取项目配置信息

项目创建完成后：

1. 在项目 Dashboard 中，点击左侧 "Settings" → "API"
2. 复制以下信息：
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role secret key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 第三步：配置环境变量

更新项目根目录的 `.env.local` 文件：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Edge API Configuration (optional - if empty, system will use mock mode)
EDGE_API_URL=

# Environment
NODE_ENV=development
```

## 第四步：创建存储桶

1. 在 Supabase Dashboard 中，点击左侧 "Storage"
2. 点击 "Create a new bucket"
3. 填写信息：
   - **Name**: `qc-images`
   - **Public bucket**: 取消勾选（保持私有）
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/*`
4. 点击 "Create bucket"

## 第五步：执行数据库脚本

按顺序在 SQL Editor 中执行以下脚本：

### 5.1 基础表结构
1. 在 Supabase Dashboard 中，点击左侧 "SQL Editor"
2. 点击 "New query"
3. 复制 `database/01_initial_schema.sql` 的内容并执行
4. 确认执行成功（无错误信息）

### 5.2 安全策略
1. 新建查询
2. 复制 `database/02_rls_policies.sql` 的内容并执行
3. 确认执行成功

### 5.3 存储配置
1. 新建查询
2. 复制 `database/03_storage_setup.sql` 的内容并执行
3. 确认执行成功

### 5.4 性能优化（推荐）
1. 新建查询
2. 复制 `database/04_performance_optimizations.sql` 的内容并执行
3. 确认执行成功

### 5.5 高级功能（可选）
1. 新建查询
2. 复制 `database/05_advanced_features.sql` 的内容并执行
3. 确认执行成功

## 第六步：验证设置

执行以下 SQL 验证数据库设置：

```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'jobs', 'photos', 'job_events');

-- 检查 RLS 是否启用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'jobs', 'photos', 'job_events');

-- 检查存储桶
SELECT * FROM storage.buckets WHERE name = 'qc-images';
```

## 第七步：测试应用

1. 重启开发服务器：
   ```bash
   npm run dev
   ```

2. 访问 `http://localhost:3000`

3. 现在应该看到真实的登录界面，而不是 Demo 模式

## 故障排除

### 问题：仍然显示 Demo 模式
**解决方案**：
- 检查 `.env.local` 文件是否正确配置
- 重启开发服务器
- 检查 Supabase 项目 URL 和 API Key 是否正确

### 问题：数据库连接失败
**解决方案**：
- 确认 Supabase 项目状态正常
- 检查网络连接
- 验证 API Key 是否有效

### 问题：存储上传失败
**解决方案**：
- 确认存储桶 `qc-images` 已创建
- 检查存储策略是否正确执行
- 验证文件大小和类型限制

## 下一步

数据库设置完成后，你可以：
1. 配置 OIDC 企业登录
2. 测试完整的质检流程
3. 配置生产环境部署