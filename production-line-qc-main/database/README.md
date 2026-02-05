# 数据库设置指南

## 概述

本目录包含产线拍照质检系统的数据库迁移脚本。

## 执行顺序

请按以下顺序在 Supabase SQL Editor 中执行脚本：

### 基础设置（必需）
1. `01_initial_schema.sql` - 创建基础表结构和索引
2. `02_rls_policies.sql` - 配置行级安全策略
3. `03_storage_setup.sql` - 配置存储桶策略

### 性能优化（推荐）
4. `04_performance_optimizations.sql` - 性能优化和统计视图

### 高级功能（可选）
5. `05_advanced_features.sql` - 批次管理、模板、设备管理等高级功能

## 存储桶创建

在执行 `03_storage_setup.sql` 之前，需要在 Supabase Dashboard 中创建存储桶：

1. 进入 Supabase 项目控制台
2. 导航到 Storage 页面
3. 创建新存储桶：
   - 名称: `qc-images`
   - 公开访问: `false`
   - 文件大小限制: `10MB` (推荐)
   - 允许的文件类型: `image/*`

## 数据库架构

### 核心表结构

#### 基础表（必需）
- **`profiles`** - 用户配置表
- **`jobs`** - 质检任务表
- **`photos`** - 照片记录表
- **`job_events`** - 事件日志表

#### 扩展表（可选）
- **`qc_batches`** - 质检批次管理
- **`qc_templates`** - 质检模板
- **`qc_standards`** - 质检标准配置
- **`qc_devices`** - 设备管理
- **`qc_reports`** - 质检报告
- **`notifications`** - 系统通知
- **`system_config`** - 系统配置

### 关系图

```
profiles (用户)
    ↓
jobs (任务) ← qc_batches (批次)
    ↓
photos (照片)
    ↓
job_events (事件日志)
```

## 性能特性

### 索引优化
- 复合索引支持常见查询模式
- 部分索引优化特定状态查询
- 时间序列索引支持历史数据查询

### 统计视图
- `job_statistics` - 按用户和日期的任务统计
- `station_statistics` - 按工位的统计数据

### 实用函数
- `get_user_daily_stats()` - 获取用户日统计
- `cleanup_old_job_events()` - 清理旧事件日志
- `check_data_integrity()` - 数据完整性检查

## 验证安装

执行完所有脚本后，可以通过以下 SQL 验证安装：

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

-- 检查存储桶是否创建
SELECT * FROM storage.buckets WHERE name = 'qc-images';

-- 检查统计视图
SELECT * FROM job_statistics LIMIT 5;

-- 运行数据完整性检查
SELECT * FROM check_data_integrity();
```

## 数据库设计优势

### 🔒 安全性
- **Row Level Security (RLS)** - 确保用户只能访问自己的数据
- **角色权限控制** - 管理员可查看全量数据
- **存储桶策略** - 文件访问权限控制

### 📊 性能
- **智能索引** - 针对查询模式优化
- **统计视图** - 预计算常用统计数据
- **分区友好** - UUID 主键支持水平扩展

### 🔍 可观测性
- **事件日志** - 完整的操作审计追踪
- **数据完整性检查** - 自动检测数据异常
- **性能监控** - 内置统计和报告功能

### 🚀 扩展性
- **模块化设计** - 核心功能与扩展功能分离
- **配置驱动** - 系统行为可通过配置调整
- **批次管理** - 支持大规模质检操作

## 生产环境建议

### 备份策略
```sql
-- 设置自动备份（在 Supabase 控制台配置）
-- 建议：每日全量备份 + 实时 WAL 备份
```

### 监控指标
- 数据库连接数
- 查询响应时间
- 存储空间使用
- RLS 策略性能

### 维护任务
```sql
-- 定期清理旧事件日志（建议每月执行）
SELECT cleanup_old_job_events(90);

-- 定期检查数据完整性（建议每周执行）
SELECT * FROM check_data_integrity();

-- 更新表统计信息（PostgreSQL 自动执行，但可手动触发）
ANALYZE;
```

## 注意事项

- 确保在生产环境中备份数据库
- RLS 策略确保数据安全，请勿随意修改
- 存储桶策略限制用户只能访问自己的文件
- 高级功能表为可选，根据实际需求选择性部署
- 定期执行数据完整性检查和清理任务