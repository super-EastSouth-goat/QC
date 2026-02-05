'use client'

import { useState, useEffect } from 'react'
import { useIsAdmin } from '@/lib/auth/hooks'
import { ProfileService } from '@/lib/services/profileService'
import { Profile, UserRole } from '@/lib/types'

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

export function AdminProfileManager() {
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('worker')
  const [editStation, setEditStation] = useState('')

  const profileService = new ProfileService()

  useEffect(() => {
    if (isAdmin) {
      loadProfiles()
    }
  }, [isAdmin])

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const data = await profileService.getAllProfiles()
      setProfiles(data)
    } catch (err) {
      setError('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile)
    setEditRole(profile.role)
    setEditStation(profile.station || '')
  }

  const handleSave = async () => {
    if (!editingProfile) return

    try {
      const updated = await profileService.updateProfile(editingProfile.id, {
        role: editRole,
        station: editStation.trim() || null,
      })

      if (updated) {
        setProfiles(profiles.map(p => p.id === editingProfile.id ? updated : p))
        setEditingProfile(null)
      } else {
        setError('更新失败')
      }
    } catch (err) {
      setError('更新失败')
    }
  }

  const handleCancel = () => {
    setEditingProfile(null)
    setEditRole('worker')
    setEditStation('')
  }

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`确定要删除用户 ${profile.id.slice(0, 8)}... 吗？`)) {
      return
    }

    try {
      const success = await profileService.deleteProfile(profile.id)
      if (success) {
        setProfiles(profiles.filter(p => p.id !== profile.id))
      } else {
        setError('删除失败')
      }
    } catch (err) {
      setError('删除失败')
    }
  }

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">您没有权限访问此功能</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">用户管理</h2>
        <button
          onClick={loadProfiles}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          刷新
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {profiles.map((profile) => (
            <li key={profile.id} className="px-6 py-4">
              {editingProfile?.id === profile.id ? (
                <div className="space-y-3">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        角色
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        工位
                      </label>
                      <input
                        type="text"
                        value={editStation}
                        onChange={(e) => setEditStation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="工位名称"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
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
                        ID: {profile.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        创建时间: {new Date(profile.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(profile)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无用户数据
        </div>
      )}
    </div>
  )
}