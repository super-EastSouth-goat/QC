'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { usePathname } from 'next/navigation'
import { User, ChevronDown, LogOut, Home, History, Settings } from 'lucide-react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !user || !profile) return null

  const navigation = [
    { name: '质检首页', href: '/', icon: Home, current: pathname === '/' },
    { name: '历史记录', href: '/history', icon: History, current: pathname === '/history' },
    ...(profile?.role === 'admin' ? [
      { name: '管理员', href: '/admin', icon: Settings, current: pathname === '/admin' }
    ] : [])
  ]

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-semibold text-gray-900">产线质检系统</h1>
          
          {/* Navigation Links */}
          <div className="hidden md:flex space-x-6">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{user.email}</div>
              <div className="text-xs text-gray-500">
                {profile.role === 'worker' ? '操作员' : profile.role === 'admin' ? '管理员' : '主管'}
                {profile.station && ` • ${profile.station}`}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">{user.email}</div>
                <div className="text-xs text-gray-500">工号: {profile.id.slice(-8)}</div>
                <div className="text-xs text-gray-500">角色: {profile.role === 'worker' ? '操作员' : profile.role === 'admin' ? '管理员' : '主管'}</div>
                {profile.station && (
                  <div className="text-xs text-gray-500">工位: {profile.station}</div>
                )}
              </div>
              
              {/* Mobile Navigation */}
              <div className="md:hidden border-b border-gray-100">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsDropdownOpen(false)}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${
                      item.current
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </a>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setIsDropdownOpen(false)
                  console.log('Navigate to profile')
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>个人设置</span>
              </button>
              
              <button
                onClick={() => {
                  setIsDropdownOpen(false)
                  signOut()
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>退出登录</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  )
}