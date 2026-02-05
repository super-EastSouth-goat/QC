import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // 如果没有配置 Supabase，使用占位符值（开发模式）
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url' || 
      !supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
    console.warn('Supabase not configured, using demo mode')
    return createBrowserClient(
      'https://demo.supabase.co',
      'demo-anon-key'
    )
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true, // 保持会话持久化
      autoRefreshToken: true, // 自动刷新token
      detectSessionInUrl: true
    }
  })
}