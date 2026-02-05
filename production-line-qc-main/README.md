# 产线拍照质检系统 (Production Line QC System)

一个基于 Next.js 的现代化生产线质检系统，支持扫码、拍照、AI质检分析和结果展示。

## 功能特性

- 🔍 扫码输入支持（扫码枪 + 手动输入）
- 📸 相机拍照功能（支持多设备选择）
- 🤖 AI质检分析集成
- 📊 历史记录查看和统计
- 🔐 基于角色的权限控制
- 📱 响应式设计，优化单手操作

## 技术栈

- **前端**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **后端**: Supabase (Auth, Database, Storage)
- **测试**: Jest, React Testing Library, fast-check (属性测试)
- **部署**: Vercel (推荐)

## 快速开始

### 1. 环境配置

复制环境变量模板：
```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 文件，填入你的 Supabase 配置：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 可选：边缘API配置（为空时使用模拟模式）
EDGE_API_URL=
```

### 2. 安装依赖

```bash
npm install
```

### 3. 数据库设置

在 Supabase 项目中执行数据库迁移脚本（见 `database/` 目录）。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 开发指南

### 项目结构

```
src/
├── app/                 # Next.js App Router 页面
├── components/          # React 组件
├── lib/
│   ├── supabase/       # Supabase 客户端配置
│   ├── types/          # TypeScript 类型定义
│   └── config.ts       # 应用配置
└── styles/             # 样式文件
```

### 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 代码检查
- `npm run test` - 运行测试
- `npm run type-check` - TypeScript 类型检查

### 测试

项目使用双重测试策略：
- **单元测试**: Jest + React Testing Library
- **属性测试**: fast-check 进行基于属性的测试

运行测试：
```bash
npm test
```

## 部署

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 部署

### 环境变量配置

确保在生产环境中设置以下环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EDGE_API_URL` (可选)

## 许可证

MIT License
