'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthActions } from '@/lib/auth/hooks'
import { startEnterpriseLogin, getEnterpriseAuthProviderName, isEnterpriseAuthAvailable } from '@/lib/auth/enterpriseAuth'

interface LoginFormProps {
  onSuccess?: () => void
  className?: string
}

export function LoginForm({ onSuccess, className = '' }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [enterpriseLoading, setEnterpriseLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin')
  const [message, setMessage] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signUp, signInWithMagicLink } = useAuthActions()

  // Check for URL messages (like email confirmation)
  useEffect(() => {
    const urlMessage = searchParams.get('message')
    if (urlMessage === 'email_confirmed') {
      setMessage('邮箱验证成功！您现在可以登录了。')
      // Clear the URL parameter
      router.replace('/auth/login', { scroll: false })
    }
  }, [searchParams, router])

  // Handle enterprise login
  const handleEnterpriseLogin = async () => {
    setEnterpriseLoading(true)
    setError(null)
    
    try {
      await startEnterpriseLogin()
      // Function will redirect to enterprise provider, won't return here
    } catch (err) {
      console.error('Enterprise login error:', err)
      setError(err instanceof Error ? err.message : '企业登录失败，请重试')
      setEnterpriseLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      let result
      
      if (mode === 'signin') {
        result = await signIn(email, password)
      } else if (mode === 'signup') {
        result = await signUp(email, password)
        if (!result.error) {
          setMessage('注册成功！请检查您的邮箱并点击确认链接来激活账户。')
          // Clear form after successful signup
          setEmail('')
          setPassword('')
        }
      } else {
        result = await signInWithMagicLink(email)
        if (!result.error) {
          setMessage('Check your email for the login link!')
        }
      }

      if (result.error) {
        setError(result.error.message)
      } else if (mode !== 'magic') {
        onSuccess?.()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            邮箱地址
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入您的邮箱"
          />
        </div>

        {mode !== 'magic' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入您的密码"
            />
            
            {/* Forgot Password Link */}
            {mode === 'signin' && (
              <div className="mt-2 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  忘记密码？
                </Link>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {message && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '处理中...' : 
           mode === 'signin' ? '登录' :
           mode === 'signup' ? '注册' : '发送登录链接'}
        </button>

        {/* Enterprise Login Section */}
        {isEnterpriseAuthAvailable() && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或使用企业账户登录</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnterpriseLogin}
              disabled={enterpriseLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {enterpriseLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
              {enterpriseLoading ? '正在跳转...' : getEnterpriseAuthProviderName()}
            </button>
          </>
        )}

        <div className="flex justify-center space-x-4 text-sm">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`${mode === 'signin' ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`${mode === 'signup' ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            注册
          </button>
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={`${mode === 'magic' ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            魔法链接
          </button>
        </div>
      </form>
    </div>
  )
}