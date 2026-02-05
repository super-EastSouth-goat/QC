'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { createClient } from '@/lib/supabase/client'

interface UserStats {
  id: string
  email: string
  role: string
  station: string | null
  total_inspections: number
  recent_inspections: number
  last_inspection: string | null
  created_at: string
}

interface SystemStats {
  total_users: number
  total_inspections: number
  inspections_today: number
  inspections_this_week: number
  pass_rate: number
}

export default function AdminPage() {
  const { user, profile } = useAuth()
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAdminData()
    }
  }, [profile])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load user statistics
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          station,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Get user emails from auth.users (need to use RPC or service role)
      const userStatsWithInspections = await Promise.all(
        users.map(async (userProfile) => {
          // Get inspection counts for each user
          const { data: inspections, error: inspError } = await supabase
            .from('inspections')
            .select('created_at, suggested_decision')
            .eq('user_id', userProfile.id)

          if (inspError) {
            console.warn('Error loading inspections for user:', userProfile.id, inspError)
          }

          const totalInspections = inspections?.length || 0
          const recentInspections = inspections?.filter(
            i => new Date(i.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length || 0
          
          const lastInspection = inspections?.[0]?.created_at || null

          // Try to get email (this might not work with RLS, will show ID instead)
          let email = userProfile.id.slice(-8) // Show last 8 chars of ID as fallback

          return {
            id: userProfile.id,
            email,
            role: userProfile.role,
            station: userProfile.station,
            total_inspections: totalInspections,
            recent_inspections: recentInspections,
            last_inspection: lastInspection,
            created_at: userProfile.created_at
          }
        })
      )

      setUserStats(userStatsWithInspections)

      // Load system statistics
      const { data: allInspections, error: allInspError } = await supabase
        .from('inspections')
        .select('created_at, suggested_decision')

      if (allInspError) throw allInspError

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const inspectionsToday = allInspections.filter(
        i => new Date(i.created_at) >= today
      ).length

      const inspectionsThisWeek = allInspections.filter(
        i => new Date(i.created_at) >= weekAgo
      ).length

      const passCount = allInspections.filter(i => i.suggested_decision === 'PASS').length
      const passRate = allInspections.length > 0 ? (passCount / allInspections.length) * 100 : 0

      setSystemStats({
        total_users: users.length,
        total_inspections: allInspections.length,
        inspections_today: inspectionsToday,
        inspections_this_week: inspectionsThisWeek,
        pass_rate: passRate
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : '加载管理员数据失败')
    } finally {
      setLoading(false)
    }
  }

  // Check if user is admin
  if (profile?.role !== 'admin') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
            <p className="text-gray-600 mb-4">您需要管理员权限才能访问此页面</p>
            <a href="/" className="text-blue-600 hover:underline">返回首页</a>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">管理员仪表板</h1>
            <p className="text-gray-600 mt-2">系统概览和用户管理</p>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* System Statistics */}
              {systemStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">总用户数</h3>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.total_users}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">总检测数</h3>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.total_inspections}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">今日检测</h3>
                    <p className="text-2xl font-bold text-blue-600">{systemStats.inspections_today}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">本周检测</h3>
                    <p className="text-2xl font-bold text-green-600">{systemStats.inspections_this_week}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-sm font-medium text-gray-500">合格率</h3>
                    <p className="text-2xl font-bold text-purple-600">{systemStats.pass_rate.toFixed(1)}%</p>
                  </div>
                </div>
              )}

              {/* User Statistics Table */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">用户统计</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          用户
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          角色
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          工位
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          总检测数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          近7天
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          最后检测
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          注册时间
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userStats.map((userStat) => (
                        <tr key={userStat.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              用户 {userStat.email}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {userStat.id.slice(-12)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userStat.role === 'admin' ? 'bg-red-100 text-red-800' :
                              userStat.role === 'supervisor' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {userStat.role === 'admin' ? '管理员' : 
                               userStat.role === 'supervisor' ? '主管' : '操作员'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {userStat.station || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {userStat.total_inspections}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                            {userStat.recent_inspections}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {userStat.last_inspection ? 
                              new Date(userStat.last_inspection).toLocaleDateString('zh-CN') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(userStat.created_at).toLocaleDateString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}