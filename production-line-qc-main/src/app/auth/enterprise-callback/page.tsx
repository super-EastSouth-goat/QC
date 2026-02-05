'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { handleEnterpriseCallback } from '@/lib/auth/enterpriseAuth'
import { signInWithOIDCToken } from '@/lib/auth/oidcService'

/**
 * Enterprise Callback Content Component
 * Handles the enterprise auth callback processing
 */
function EnterpriseCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log('Processing enterprise auth callback...')

        // Handle enterprise callback using the unified service
        const { tokens, userInfo } = await handleEnterpriseCallback(searchParams)

        console.log('Enterprise callback successful, signing in to Supabase...')

        // Sign in to Supabase using the enterprise tokens
        await signInWithOIDCToken(tokens.id_token, userInfo)

        console.log('Sign in successful, redirecting to home...')

        // Redirect to home page
        router.push('/')
      } catch (err) {
        console.error('Enterprise callback error:', err)
        setError(err instanceof Error ? err.message : '企业登录失败，请重试')
        setProcessing(false)
      }
    }

    processCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">企业登录失败</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                返回登录页面
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg
              className="animate-spin h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {processing ? '正在处理企业登录...' : '登录成功'}
          </h3>
          <p className="text-sm text-gray-500">
            {processing ? '请稍候，正在验证您的企业账户' : '即将跳转到首页'}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Enterprise Callback Page
 * Handles callbacks from enterprise authentication providers
 */
export default function EnterpriseCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <EnterpriseCallbackContent />
    </Suspense>
  )
}