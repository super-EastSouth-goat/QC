'use client'

import { useRequireAuth, useRequireRole } from '@/lib/auth/hooks'
import { UserRole } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallback?: React.ReactNode
}

export function AuthGuard({ children, requiredRoles, fallback }: AuthGuardProps) {
  const { loading: authLoading, isAuthenticated } = useRequireAuth()
  // Always call useRequireRole, even if requiredRoles is empty
  const { hasAccess, loading: roleLoading, role } = useRequireRole(requiredRoles || [])
  const router = useRouter()

  // All hooks must be called before any conditional logic
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Calculate loading state
  const isLoading = authLoading || (requiredRoles && requiredRoles.length > 0 && roleLoading)
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show loading while redirecting to login
  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show access denied if role requirements not met
  const hasRoleRequirements = requiredRoles && requiredRoles.length > 0
  if (hasRoleRequirements && !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">访问被拒绝</h1>
          <p className="text-gray-600 mb-4">
            您的角色 ({role}) 无权访问此页面
          </p>
          <p className="text-sm text-gray-500">
            需要角色: {requiredRoles.join(', ')}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}