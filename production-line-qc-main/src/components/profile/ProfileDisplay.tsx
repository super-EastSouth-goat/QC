'use client'

import { useProfile, useAuthActions } from '@/lib/auth/hooks'
import { UserRole } from '@/lib/types'

interface ProfileDisplayProps {
  showActions?: boolean
  className?: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  worker: '产线工人',
  supervisor: '主管',
  engineer: '工程师',
  admin: '管理员',
}

const ROLE_COLORS: Record<UserRole, string> = {
  worker: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-green-100 text-green-800',
  engineer: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
}

export function ProfileDisplay({ showActions = true, className = '' }: ProfileDisplayProps) {
  const { profile, loading } = useProfile()
  const { signOut } = useAuthActions()

  const handleSignOut = async () => {
    // Redirect to logout page for better UX
    window.location.href = '/auth/logout'
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-16"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        未找到用户配置
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[profile.role]}`}>
              {ROLE_LABELS[profile.role]}
            </span>
            {profile.station && (
              <span className="text-sm text-gray-600">
                工位: {profile.station}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ID: {profile.id.slice(0, 8)}...
          </div>
        </div>
        
        {showActions && (
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            退出
          </button>
        )}
      </div>
    </div>
  )
}