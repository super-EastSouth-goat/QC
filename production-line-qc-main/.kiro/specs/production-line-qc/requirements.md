# 产线拍照质检系统需求文档

## 介绍

产线拍照质检系统是一个Web应用程序，旨在为生产线工人提供快速、简单的质检流程。工人通过扫码、拍照、获取AI判定结果的方式完成质检任务，同时为主管和工程师提供历史记录查看和统计分析功能。

## 术语表

- **QC_System**: 产线拍照质检系统
- **Production_Worker**: 产线工人，系统的主要用户
- **Supervisor**: 主管，可查看历史记录和统计数据的次要用户
- **Engineer**: 工程师，可查看历史记录和统计数据的次要用户
- **Job**: 质检任务，由扫码创建的唯一工作单元
- **Barcode**: 条形码，用于标识待检测产品
- **Edge_API**: 边缘计算API，负责图像分析和质检判定
- **QC_Result**: 质检结果，包含PASS或FAIL状态

## 需求

### 需求 1

**用户故事:** 作为产线工人，我希望能够快速扫码创建质检任务，以便开始产品质检流程。

#### 验收标准

1. WHEN Production_Worker访问首页，THEN QC_System SHALL显示扫码输入框界面
2. WHEN Production_Worker使用扫码枪扫描条形码，THEN QC_System SHALL自动接收输入并创建唯一的Job
3. WHEN扫码完成后，THEN QC_System SHALL自动聚焦到下一个操作步骤
4. WHEN Production_Worker按下Enter键或点击确认按钮，THEN QC_System SHALL提交扫码数据并进入拍照阶段
5. WHEN Job创建成功，THEN QC_System SHALL生成唯一job_id并绑定后续操作

### 需求 2

**用户故事:** 作为产线工人，我希望能够使用相机拍摄产品照片，以便进行质检分析。

#### 验收标准

1. WHEN Production_Worker进入拍照阶段，THEN QC_System SHALL显示相机预览窗口
2. WHEN QC_System请求相机权限被拒绝，THEN QC_System SHALL显示清晰的权限获取引导
3. WHEN存在多个摄像头设备，THEN QC_System SHALL提供摄像头选择功能
4. WHEN Production_Worker点击拍照按钮，THEN QC_System SHALL捕获当前画面并显示预览
5. WHEN Production_Worker对照片不满意，THEN QC_System SHALL提供重拍功能

### 需求 3

**用户故事:** 作为产线工人，我希望能够上传照片并获得质检结果，以便完成质检任务。

#### 验收标准

1. WHEN Production_Worker确认上传照片，THEN QC_System SHALL显示上传进度并禁用重复提交
2. WHEN照片上传到Supabase Storage成功，THEN QC_System SHALL调用Edge_API进行质检分析
3. WHEN等待质检结果时，THEN QC_System SHALL显示处理状态：queued/uploading/processing/done/error/timeout
4. WHEN质检分析完成，THEN QC_System SHALL显示结果：PASS/FAIL状态、时间戳、job_id和图片缩略图
5. WHEN质检任务完成，THEN QC_System SHALL提供"开始下一单"功能清空当前状态

### 需求 4

**用户故事:** 作为产线工人，我希望系统能够自动轮询质检结果，以便及时获得反馈。

#### 验收标准

1. WHEN照片上传成功后，THEN QC_System SHALL每1-2秒自动轮询一次结果状态
2. WHEN轮询超过30秒仍无结果，THEN QC_System SHALL显示超时状态并提供手动刷新选项
3. WHEN Edge_API调用失败，THEN QC_System SHALL进行最多2次重试
4. WHEN重试仍然失败，THEN QC_System SHALL记录错误状态到jobs表和job_events表
5. WHEN Production_Worker手动刷新，THEN QC_System SHALL立即查询最新状态

### 需求 5

**用户故事:** 作为主管或工程师，我希望能够查看历史质检记录，以便监控生产质量。

#### 验收标准

1. WHEN Supervisor或Engineer访问历史记录页，THEN QC_System SHALL显示当前用户的质检记录列表
2. WHEN显示历史记录时，THEN QC_System SHALL按时间倒序排列，包含job_id、barcode、created_at、result、image字段
3. WHEN用户需要筛选记录时，THEN QC_System SHALL提供日期范围和PASS/FAIL状态筛选功能
4. WHEN显示统计信息时，THEN QC_System SHALL展示今日上传数量、PASS数量、FAIL数量
5. WHERE用户具有admin或manager权限，THEN QC_System SHALL允许查看全量历史记录

### 需求 6

**用户故事:** 作为系统用户，我希望通过安全的身份验证访问系统，以便保护数据安全。

#### 验收标准

1. WHEN用户访问系统，THEN QC_System SHALL使用Supabase Auth进行身份验证
2. WHEN用户登录时，THEN QC_System SHALL支持email+password或magic link认证方式
3. WHEN用户通过认证，THEN QC_System SHALL根据用户角色分配相应权限
4. WHEN普通用户操作数据时，THEN QC_System SHALL通过Row Level Security确保只能访问自己的记录
5. WHERE用户角色为admin或manager，THEN QC_System SHALL允许读取全量数据

### 需求 7

**用户故事:** 作为系统管理员，我希望系统能够与边缘计算API集成，以便实现自动化质检分析。

#### 验收标准

1. WHEN照片上传成功后，THEN QC_System SHALL调用可配置的Edge_API进行分析
2. WHEN EDGE_API_URL环境变量为空，THEN QC_System SHALL使用模拟分析返回随机结果
3. WHEN调用Edge_API时，THEN QC_System SHALL发送包含job_id、barcode、image_url的POST请求
4. WHEN Edge_API返回结果，THEN QC_System SHALL解析包含status、result、detail的响应
5. WHEN API调用超时或失败，THEN QC_System SHALL记录详细错误信息到job_events表

### 需求 8

**用户故事:** 作为系统用户，我希望系统具有良好的错误恢复能力，以便在异常情况下继续工作。

#### 验收标准

1. WHEN网络连接中断时，THEN QC_System SHALL显示连接状态并支持重试操作
2. WHEN相机设备不可用时，THEN QC_System SHALL提供清晰的错误提示和解决方案
3. WHEN上传失败时，THEN QC_System SHALL保留用户数据并提供重新上传选项
4. WHEN系统发生未预期错误时，THEN QC_System SHALL记录错误日志并显示用户友好的错误信息
5. WHEN用户刷新页面时，THEN QC_System SHALL恢复到合适的状态而不丢失重要数据