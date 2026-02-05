import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // 如果没有配置 Supabase，使用占位符值（开发模式）
  const url = (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') 
    ? 'https://demo.supabase.co' 
    : supabaseUrl
  const key = (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') 
    ? 'demo-anon-key' 
    : supabaseAnonKey

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}