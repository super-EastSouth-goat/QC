# 海康威视网络相机集成修改日志

## 概述

**修改日期**: 2026-02-04  
**修改目的**: 实现前端页面对边缘机海康威视工业相机的实时画面访问  
**涉及项目**:
- 后端: `Jenny/Jenny/YOLO/qc-edge-infer` (FastAPI Python 服务)
- 前端: `production-line-qc-main` (Next.js 应用)

## 网络环境

| 设备 | 内网 IP | 公网 IP | 端口 |
|------|---------|---------|------|
| 边缘机 (后端) | 172.16.40.91 | 221.226.60.30 | 8000 |
| AWS 服务器 (前端) | - | 69.230.223.12 | 3110 |

## 修改清单

---

### 1. 后端修改: CORS 配置更新

**文件**: `Jenny/Jenny/YOLO/qc-edge-infer/app/main.py`

**修改内容**:
- 更新 `ALLOWED_ORIGINS` 列表，确保包含前端域名
- 添加对视频流的 CORS 支持

**修改前**:
```python
ALLOWED_ORIGINS = ["http://69.230.223.12:3110"]
```

**修改后**:
```python
ALLOWED_ORIGINS = [
    "http://69.230.223.12:3110",
    "http://localhost:3000",
    "http://localhost:3110",
]
```

**原因**: 支持生产环境和本地开发环境的跨域请求。

---

### 2. 前端修改: 创建相机代理 API 路由

**新增文件**: `production-line-qc-main/src/app/api/camera-proxy/route.ts`

**功能**:
- 代理转发边缘机的视频流 `/api/camera/video_feed`
- 代理转发相机设备列表 `/api/camera/devices`
- 解决浏览器混合内容 (Mixed Content) 和 CORS 限制

**技术要点**:
- 使用 Next.js Route Handlers
- 流式转发 MJPEG 视频数据
- 保持长连接直到客户端断开

---

### 3. 前端修改: CameraCapture 组件增强

**文件**: `production-line-qc-main/src/components/qc/CameraCapture.tsx`

**修改内容**:
- 新增"网络相机"模式 (mode: 'network')
- 检测边缘机相机可用性
- 支持从网络相机流中截图
- 保持原有本地相机和上传功能

**新增状态**:
```typescript
type CaptureMode = 'camera' | 'upload' | 'network';
const [networkCameraUrl, setNetworkCameraUrl] = useState<string | null>(null);
const [networkCameraAvailable, setNetworkCameraAvailable] = useState(false);
```

---

### 4. 前端修改: EdgeInferenceService 扩展

**文件**: `production-line-qc-main/src/lib/services/edgeInferenceService.ts`

**新增方法**:
- `getCameraDevices()`: 获取边缘机可用相机列表
- `getVideoFeedUrl()`: 获取视频流代理 URL

---

### 5. Bug 修复: NG 响应映射

**文件**: `production-line-qc-main/src/lib/services/edgeInferenceService.ts`

**问题描述**:
后端返回 `suggested_decision: "NG"` 时，前端验证失败导致抛出异常。

**修改前**:
```typescript
['PASS', 'FAIL', 'UNKNOWN', 'OK'].includes(data.suggested_decision)
```

**修改后**:
```typescript
['PASS', 'FAIL', 'UNKNOWN', 'OK', 'NG'].includes(data.suggested_decision)
```

同时添加 NG → FAIL 的映射逻辑。

---

## 数据流图

```
用户浏览器 (69.230.223.12:3110)
    │
    ├─── 本地相机 ──► navigator.mediaDevices.getUserMedia
    │
    ├─── 本地上传 ──► <input type="file">
    │
    └─── 网络相机 ──► /api/camera-proxy?endpoint=video_feed
                         │
                         ▼
                    Next.js API Route (代理)
                         │
                         ▼
                    边缘机 (221.226.60.30:8000)
                         │
                         ▼
                    /api/camera/video_feed
                         │
                         ▼
                    海康威视 MVS 相机 (HikCameraDll)
```

---

## 测试步骤

### 1. 验证后端视频流
```bash
# 直接访问边缘机调试页面
curl http://221.226.60.30:8000/view

# 检查相机设备列表
curl http://221.226.60.30:8000/api/camera/devices
```

### 2. 验证前端代理
```bash
# 检查代理是否工作
curl http://69.230.223.12:3110/api/camera-proxy?endpoint=devices
```

### 3. 功能测试
1. 访问前端主页面
2. 输入条码后进入拍照界面
3. 切换到"网络相机"标签
4. 确认能看到边缘机相机画面
5. 点击"拍照"截取当前画面
6. 确认上传和推理流程正常

---

## 回滚方案

如需回滚，可以：
1. 恢复 `CameraCapture.tsx` 到修改前版本
2. 删除 `src/app/api/camera-proxy/route.ts`
3. 恢复 `edgeInferenceService.ts` 中的修改

---

## 后续优化建议

1. **性能优化**: 考虑在边缘机端降低视频流分辨率以减少带宽
2. **安全增强**: 为视频流接口添加认证机制
3. **用户体验**: 添加网络相机连接状态指示器
4. **错误处理**: 优化网络断开时的重连机制

---

## 修改文件清单

| 操作 | 文件路径 |
|------|----------|
| 修改 | `Jenny/Jenny/YOLO/qc-edge-infer/app/main.py` |
| 新增 | `production-line-qc-main/src/app/api/camera-proxy/route.ts` |
| 修改 | `production-line-qc-main/src/components/qc/CameraCapture.tsx` |
| 修改 | `production-line-qc-main/src/lib/services/edgeInferenceService.ts` |
| 新增 | `CHANGELOG_CAMERA_INTEGRATION.md` (本文档) |

---

## 详细代码变更

### 文件 1: `Jenny/Jenny/YOLO/qc-edge-infer/app/main.py`

**变更类型**: 修改  
**变更行**: 第 33-38 行

```python
# 修改前
ALLOWED_ORIGINS = ["http://69.230.223.12:3110"]

# 修改后
ALLOWED_ORIGINS = [
    "http://69.230.223.12:3110",   # 生产环境 AWS 前端
    "http://localhost:3000",        # 本地开发环境
    "http://localhost:3110",        # 本地开发环境 (备用端口)
    "http://127.0.0.1:3000",        # 本地开发环境
    "http://127.0.0.1:3110",        # 本地开发环境 (备用端口)
]
```

---

### 文件 2: `production-line-qc-main/src/app/api/camera-proxy/route.ts`

**变更类型**: 新增  
**功能**: 相机代理 API，转发边缘机视频流和设备信息

**主要功能**:
- `GET /api/camera-proxy?endpoint=devices` - 获取相机设备列表
- `GET /api/camera-proxy?endpoint=video_feed` - 获取 MJPEG 视频流
- `GET /api/camera-proxy?endpoint=status` - 获取相机状态

---

### 文件 3: `production-line-qc-main/src/lib/services/edgeInferenceService.ts`

**变更类型**: 修改  
**变更内容**:

1. **新增接口** `NetworkCameraDevice`:
```typescript
export interface NetworkCameraDevice {
  id: string
  label: string
  url: string
}
```

2. **修复响应类型** - 添加 `'NG'` 支持:
```typescript
suggested_decision: 'PASS' | 'FAIL' | 'UNKNOWN' | 'OK' | 'NG'
```

3. **修复响应归一化** - 添加 NG → FAIL 映射:
```typescript
if (data.suggested_decision === 'NG') {
  normalizedDecision = 'FAIL'
}
```

4. **新增方法**:
- `getNetworkCameraDevices()`: 获取网络相机设备列表
- `getVideoFeedUrl()`: 获取视频流代理 URL
- `checkNetworkCameraAvailable()`: 检查网络相机可用性

---

### 文件 4: `production-line-qc-main/src/components/qc/CameraCapture.tsx`

**变更类型**: 修改  
**变更内容**:

1. **新增模式**: `'network'` - 网络相机模式

2. **新增状态变量**:
```typescript
const [networkCameraAvailable, setNetworkCameraAvailable] = useState(false);
const [networkCameraLoading, setNetworkCameraLoading] = useState(false);
const [networkCameraError, setNetworkCameraError] = useState<string | null>(null);
const [networkCameraUrl, setNetworkCameraUrl] = useState<string | null>(null);
const networkImageRef = useRef<HTMLImageElement>(null);
```

3. **新增函数**:
- `checkNetworkCamera()`: 检查网络相机可用性
- `captureNetworkPhoto()`: 从网络相机截图

4. **UI 变更**:
- 模式选择器新增"网络相机"按钮，带状态指示器
- 新增网络相机视频流显示区域
- 新增网络相机截图按钮

---

## Git 提交建议

```bash
# 提交所有修改
git add .

# 提交信息
git commit -m "feat: 集成海康威视网络相机支持

- 后端: 更新 CORS 配置支持多个来源
- 前端: 新增相机代理 API 解决跨域问题
- 前端: CameraCapture 组件支持网络相机模式
- 前端: 修复 NG 响应映射问题 (NG → FAIL)
- 文档: 添加完整的修改日志

涉及文件:
- Jenny/Jenny/YOLO/qc-edge-infer/app/main.py
- production-line-qc-main/src/app/api/camera-proxy/route.ts (新增)
- production-line-qc-main/src/components/qc/CameraCapture.tsx
- production-line-qc-main/src/lib/services/edgeInferenceService.ts
- CHANGELOG_CAMERA_INTEGRATION.md (新增)"
```

---

## 部署注意事项

### 后端部署
1. 重启 FastAPI 服务以加载新的 CORS 配置
```bash
# 在边缘机上
cd Jenny/Jenny/YOLO/qc-edge-infer
# 如果使用 uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 前端部署
1. 重新构建并部署 Next.js 应用
```bash
cd production-line-qc-main
npm run build
npm start
# 或使用 pm2
pm2 restart production-line-qc
```

## 故障排查

如果遇到连接问题、画面卡顿或报错，请查阅详细的排查指南：
👉 [TROUBLESHOOTING_CAMERA.md](./TROUBLESHOOTING_CAMERA.md)

包含：
- 网络与防火墙配置检查
- 相机驱动与硬件依赖问题
- 并发性能瓶颈分析
- 快速定位步骤

---

## 环境变量确认

确保以下环境变量已正确配置：

**前端 (.env.local 或 .env.production)**:
```bash
NEXT_PUBLIC_EDGE_API_BASE_URL=http://221.226.60.30:8000
```

---

**文档完成时间**: 2026-02-04 23:30

