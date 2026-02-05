import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 获取请求的真实 origin
 * 优先使用 x-forwarded-host，避免 localhost 问题
 */
function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
  
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  
  // Fallback: 使用 request.url 的 origin
  const url = new URL(request.url)
  return url.origin
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams } = url
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  // 获取真实 origin（避免 localhost）
  const requestOrigin = getRequestOrigin(request)
  
  console.log('Supabase callback:', {
    origin: url.origin,
    requestOrigin,
    forwardedHost: request.headers.get('x-forwarded-host'),
    code: code ? 'present' : 'missing'
  })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 使用 requestOrigin 构造重定向 URL
      return NextResponse.redirect(new URL(next, requestOrigin))
    }
  }

  // 使用 requestOrigin 构造错误页 URL
  return NextResponse.redirect(new URL('/auth/auth-code-error', requestOrigin))
}