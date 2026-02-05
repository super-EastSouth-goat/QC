# 安全增强措施

## 当前架构的额外安全措施

### 1. 环境变量安全
```bash
# 生产环境使用密钥管理
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # 只读权限
SUPABASE_SERVICE_ROLE_KEY=eyJ... # 服务端专用，不暴露给前端
```

### 2. CSP 安全头
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ];
  }
};
```

### 3. 域名白名单
```typescript
// 在 Supabase 中配置允许的重定向域名
const allowedDomains = [
  'http://localhost:3000',
  'https://your-production-domain.com'
];
```

### 4. Rate Limiting
```typescript
// middleware.ts 中添加
import { ratelimit } from '@/lib/ratelimit';

export async function middleware(request: NextRequest) {
  // Rate limiting for auth endpoints
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return new Response('Too Many Requests', { status: 429 });
    }
  }
  
  return await updateSession(request);
}
```

### 5. 审计日志
```typescript
// 记录所有认证事件
const logAuthEvent = async (event: string, userId: string, ip: string) => {
  await supabase.from('auth_logs').insert({
    event,
    user_id: userId,
    ip_address: ip,
    timestamp: new Date().toISOString()
  });
};
```