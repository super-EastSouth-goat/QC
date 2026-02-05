'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  // 强制设置 profile 的函数
  const forceSetProfile = (userId: string) => {
    const forcedProfile = {
      id: userId,
      role: 'worker' as const,
      station: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    console.log('Force setting profile:', forcedProfile);
    setProfile(forcedProfile);
    return forcedProfile;
  };

  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Profile fetch error:', error);
        // 如果 profile 不存在，自动创建一个
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile for user:', userId)
          return await createProfile(userId)
        }
        
        // 对于其他错误，返回 null 让调用者处理
        return null
      }
      
      console.log('Profile fetched successfully:', data);
      return data
    } catch (error) {
      console.error('Profile fetch exception:', error)
      return null
    }
  }

  const createProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'worker',
          station: null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        // 即使创建失败，也返回默认 profile
        return {
          id: userId,
          role: 'worker' as const,
          station: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      console.log('Profile created successfully:', data)
      return data
    } catch (error) {
      console.error('Error creating profile:', error)
      // 返回默认 profile
      return {
        id: userId,
        role: 'worker' as const,
        station: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      console.log('Refresh profile called for user:', user.id);
      forceSetProfile(user.id);
    }
  }

  useEffect(() => {
    // 检查是否是演示模式
    const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' || 
                      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://demo.supabase.co'

    if (isDemoMode) {
      // 演示模式：创建模拟用户和配置
      const demoUser = {
        id: 'demo-user-123',
        email: 'demo@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated'
      } as User
      
      const demoProfile = {
        id: 'demo-user-123',
        role: 'worker' as const,
        station: '工位A',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setUser(demoUser)
      setProfile(demoProfile)
      setLoading(false)
      console.log('Running in demo mode - Supabase not configured')
    } else {
      // 真实 Supabase 模式
      // 设置超时，确保不会永远加载
      const loadingTimeout = setTimeout(() => {
        console.warn('Auth loading timeout, setting loading to false');
        setLoading(false);
      }, 10000); // 10秒超时

      // Get initial session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        clearTimeout(loadingTimeout);
        
        // 检查是否在退出登录后1小时内（只在客户端执行）
        if (typeof window !== 'undefined') {
          const lastSignOutTime = localStorage.getItem('lastSignOutTime')
          if (lastSignOutTime) {
            const oneHour = 60 * 60 * 1000 // 1小时的毫秒数
            const timeSinceSignOut = Date.now() - parseInt(lastSignOutTime)
            
            if (timeSinceSignOut < oneHour && session) {
              // 在1小时内且有有效会话，自动登录
              setSession(session)
              setUser(session.user)
              forceSetProfile(session.user.id)
              setLoading(false)
              return
            } else if (timeSinceSignOut >= oneHour) {
              // 超过1小时，清除会话
              await supabase.auth.signOut()
              localStorage.removeItem('lastSignOutTime')
              setSession(null)
              setUser(null)
              setProfile(null)
              setLoading(false)
              return
            }
          }
        }
        
        // 没有退出登录记录，正常处理会话
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('User found:', session.user.email, 'ID:', session.user.id);
          forceSetProfile(session.user.id);
        }
        
        setLoading(false)
      }).catch((error) => {
        clearTimeout(loadingTimeout);
        console.error('Error getting session:', error);
        setLoading(false);
      })

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('Auth state change - User found:', session.user.email);
          forceSetProfile(session.user.id);
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      })

      return () => {
        clearTimeout(loadingTimeout);
        subscription.unsubscribe();
      }
    }
  }, []) // 移除依赖项，只在组件挂载时执行一次

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    // Get the site URL from environment or current origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Redirect to login page after email confirmation
        emailRedirectTo: `${siteUrl}/auth/login?message=email_confirmed`,
      },
    })
    
    // If signup successful and user is created, create a profile
    if (!error && data.user) {
      try {
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            role: 'worker',
          })
      } catch (profileError) {
        console.error('Error creating profile:', profileError)
        // Don't return error here as the user was created successfully
      }
    }
    
    return { error }
  }

  const signInWithMagicLink = async (email: string) => {
    // Get the site URL from environment or current origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })
    return { error }
  }

  const signOut = async () => {
    // 记录退出登录时间
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSignOutTime', Date.now().toString())
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signInWithMagicLink,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}