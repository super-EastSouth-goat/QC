'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/lib/auth/hooks'
import { ProfileService } from '@/lib/services/profileService'
import { UserRole } from '@/lib/types'

interface ProfileFormProps {
  onSuccess?: () => void
  className?: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  worker: '产线工人',
  supervisor: '主管',
  engineer: '工程师',
  admin: '管理员',
}

export function ProfileForm({ onSuccess, className = '' }: ProfileFormProps) {
  const { profile, loading: profileLoading, refreshProfile } = useProfile()
  const [role, setRole] = useState<UserRole>('worker')
  const [station, setStation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const profileService = new ProfileService()

  useEffect(() => {
    if (profile) {
      setRole(profile.role)
      setStation(profile.station || '')
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!profile?.id) {
        setError('用户信息不完整')
        return
      }

      const updatedProfile = await profileService.updateProfile(profile.id, {
        role,
        station: station.trim() || null,
      })

      if (updatedProfile) {
        setSuccess('配置更新成功')
        await refreshProfile()
        onSuccess?.()
      } else {
        setError('更新失败，请重试')
      }
    } catch (err) {
      setError('发生未知错误')
    } finally {
      setLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            用户角色
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="station" className="block text-sm font-medium text-gray-700 mb-1">
            工位 (可选)
          </label>
          <input
            id="station"
            type="text"
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入工位名称"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '更新中...' : '更新配置'}
        </button>
      </form>
    </div>
  )
}