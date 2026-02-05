# 产线拍照质检系统设计文档

## 概述

产线拍照质检系统是一个基于 Next.js + TypeScript + Tailwind CSS 的现代Web应用，后端使用 Supabase 提供认证、数据库、存储和实时功能。系统采用响应式设计，优化单手操作体验，支持扫码枪输入、相机拍照、AI质检分析和结果展示。

## 架构

### 整体架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   前端 (Next.js) │    │  Supabase 后端    │    │   边缘计算API    │
│                 │    │                  │    │                 │
│ • React组件     │◄──►│ • Auth认证       │    │ • 图像分析      │
│ • TypeScript    │    │ • PostgreSQL     │◄──►│ • 质检判定      │
│ • Tailwind CSS  │    │ • Storage存储    │    │ • 结果返回      │
│ • 状态管理      │    │ • RLS权限控制    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 数据流图
```
扫码输入 → 创建Job → 相机拍照 → 上传图片 → 调用边缘API → 轮询结果 → 显示结果
    ↓           ↓          ↓          ↓           ↓            ↓
  验证码    生成job_id   获取权限   Storage   发送分析请求   更新状态
    ↓           ↓          ↓          ↓           ↓            ↓
 创建记录   绑定用户   预览确认   记录路径   等待响应    完成任务
```

## 组件和接口

### 核心组件

#### 1. BarcodeInput 组件
```typescript
interface BarcodeInputProps {
  onBarcodeSubmit: (barcode: string) => void;
  isLoading: boolean;
  autoFocus: boolean;
}
```

#### 2. CameraCapture 组件
```typescript
interface CameraCaptureProps {
  onPhotoCapture: (photoBlob: Blob) => void;
  onCancel: () => void;
  jobId: string;
}
```

#### 3. ResultPanel 组件
```typescript
interface ResultPanelProps {
  job: Job;
  onStartNext: () => void;
  isPolling: boolean;
}
```

#### 4. HistoryTable 组件
```typescript
interface HistoryTableProps {
  jobs: Job[];
  onFilter: (filters: FilterOptions) => void;
  currentUser: User;
}
```

### API 接口

#### Supabase Client 配置
```typescript
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}
```

#### 边缘API接口
```typescript
// POST /infer
interface EdgeAPIRequest {
  job_id: string;
  barcode: string;
  image_url: string;
}

interface EdgeAPIResponse {
  status: 'success' | 'error';
  result: 'PASS' | 'FAIL';
  detail?: string;
  confidence?: number;
}
```

## 数据模型

### 数据库表结构

```sql
-- 用户配置表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'supervisor', 'engineer', 'admin')),
  station TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 质检任务表
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  barcode TEXT NOT NULL,
  station TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'uploading', 'processing', 'completed', 'failed', 'timeout')),
  result TEXT CHECK (result IN ('PASS', 'FAIL')),
  confidence DECIMAL(3,2),
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 照片记录表
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务事件日志表（用于审计和排错）
CREATE TABLE job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_jobs_user_id_created_at ON jobs(user_id, created_at DESC);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_photos_job_id ON photos(job_id);
CREATE INDEX idx_job_events_job_id ON job_events(job_id, created_at);
```

### Row Level Security (RLS) 策略

```sql
-- 启用RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;

-- Profiles表策略
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Jobs表策略
CREATE POLICY "Workers can view own jobs" ON jobs
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'engineer', 'admin')
    )
  );

CREATE POLICY "Workers can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers can update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Photos表策略
CREATE POLICY "Users can view related photos" ON photos
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'engineer', 'admin')
    )
  );

CREATE POLICY "Users can insert own photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Job Events表策略
CREATE POLICY "Users can view related events" ON job_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_events.job_id 
      AND (jobs.user_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM profiles 
             WHERE id = auth.uid() 
             AND role IN ('supervisor', 'engineer', 'admin')
           ))
    )
  );

CREATE POLICY "System can insert events" ON job_events
  FOR INSERT WITH CHECK (true);
```

### Storage 配置

```sql
-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('qc-images', 'qc-images', false);

-- 存储桶策略
CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'qc-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'qc-images' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('supervisor', 'engineer', 'admin')
      )
    )
  );
```

## 错误处理

### 错误分类和处理策略

1. **网络错误**
   - 自动重试机制（最多2次）
   - 显示网络状态指示器
   - 提供手动重试选项

2. **相机权限错误**
   - 显示权限请求引导
   - 提供备用上传方案
   - 记录权限状态

3. **上传错误**
   - 保留用户数据
   - 显示详细错误信息
   - 支持重新上传

4. **API调用错误**
   - 记录到job_events表
   - 显示用户友好错误信息
   - 提供联系支持选项

### 错误恢复机制

```typescript
interface ErrorRecoveryStrategy {
  retryCount: number;
  maxRetries: number;
  backoffDelay: number;
  fallbackAction?: () => void;
}
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：Job创建唯一性
*对于任意*条形码输入，系统创建的每个Job都应该具有唯一的job_id，且该job_id应该绑定到创建用户
**验证：需求 1.2, 1.5**

### 属性 2：拍照功能完整性
*对于任意*拍照操作，系统应该能够捕获画面、显示预览，并提供重拍选项
**验证：需求 2.4, 2.5**

### 属性 3：上传状态管理
*对于任意*照片上传操作，系统应该显示正确的处理状态，并在上传过程中禁用重复提交
**验证：需求 3.1, 3.3**

### 属性 4：API集成和调用
*对于任意*成功的照片上传，系统应该调用Edge_API并发送包含job_id、barcode、image_url的正确格式请求
**验证：需求 3.2, 7.1, 7.3**

### 属性 5：结果显示格式
*对于任意*质检结果，系统应该显示包含PASS/FAIL状态、时间戳、job_id和图片缩略图的完整信息
**验证：需求 3.4**

### 属性 6：轮询机制
*对于任意*上传成功的任务，系统应该按照1-2秒间隔自动轮询结果状态
**验证：需求 4.1**

### 属性 7：重试机制
*对于任意*API调用失败，系统应该进行最多2次重试，并在最终失败时记录错误状态
**验证：需求 4.3, 4.4**

### 属性 8：历史记录排序和显示
*对于任意*历史记录查询，系统应该按时间倒序返回结果，并包含所有必需字段（job_id、barcode、created_at、result、image）
**验证：需求 5.2**

### 属性 9：筛选功能
*对于任意*筛选条件（日期范围、PASS/FAIL状态），系统应该返回符合条件的记录子集
**验证：需求 5.3**

### 属性 10：统计计算准确性
*对于任意*时间段的数据，系统计算的统计数据（上传数量、PASS数量、FAIL数量）应该与实际记录数量一致
**验证：需求 5.4**

### 属性 11：权限控制
*对于任意*用户和数据操作，系统应该根据用户角色正确控制数据访问权限：普通用户只能访问自己的记录，管理员可以访问全量数据
**验证：需求 5.5, 6.3, 6.4, 6.5**

### 属性 12：认证机制
*对于任意*用户访问，系统应该通过Supabase Auth进行身份验证，并支持配置的认证方式
**验证：需求 6.1, 6.2**

### 属性 13：API响应解析
*对于任意*Edge_API响应，系统应该正确解析包含status、result、detail的响应格式
**验证：需求 7.4**

### 属性 14：错误记录和处理
*对于任意*系统错误（API失败、上传失败、未预期错误），系统应该记录详细错误信息到job_events表并显示用户友好的错误信息
**验证：需求 7.5, 8.3, 8.4**

### 属性 15：状态恢复
*对于任意*页面刷新操作，系统应该恢复到合适的状态而不丢失重要的用户数据
**验证：需求 8.5**

## 测试策略

### 双重测试方法

系统将采用单元测试和属性测试相结合的方法：
- **单元测试**：验证具体示例、边缘情况和错误条件
- **属性测试**：验证应该在所有输入中保持的通用属性
- 两者互补提供全面覆盖：单元测试捕获具体错误，属性测试验证通用正确性

### 单元测试要求

单元测试通常覆盖：
- 演示正确行为的具体示例
- 组件之间的集成点
- 单元测试很有用，但避免写太多。属性测试的工作是处理大量输入的覆盖。

### 属性测试要求

- 必须为目标语言选择属性测试库：使用 **fast-check** 进行JavaScript/TypeScript属性测试
- 每个属性测试必须配置为运行最少100次迭代
- 每个属性测试必须用注释明确引用设计文档中的正确性属性，使用格式：'**Feature: production-line-qc, Property {number}: {property_text}**'
- 每个正确性属性必须由单个属性测试实现

### 集成测试
- 端到端用户流程测试
- Supabase集成测试
- 相机功能测试
- 文件上传测试