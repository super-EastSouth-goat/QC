'use client'

import React from 'react'
import { RotateCcw, X, Clock } from 'lucide-react'
import { useRecoveryPrompt } from '@/lib/hooks/useStateRecovery'

/**
 * 状态恢复提示组件
 * 需求: 8.5 - 页面刷新后状态恢复
 */
export function RecoveryPrompt() {
  const { showPrompt, recoveryInfo, handleRecover, handleDecline } = useRecoveryPrompt()

  if (!showPrompt || !recoveryInfo) {
    return null
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) {
      return '刚刚'
    } else if (diffMins < 60) {
      return `${diffMins}分钟前`
    } else {
      const diffHours = Math.floor(diffMins / 60)
      return `${diffHours}小时前`
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              恢复会话
            </h3>
          </div>
          <button
            onClick={handleDecline}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-3">
            检测到您有一个未完成的质检任务，是否要继续？
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">当前步骤:</span>
              <span className="text-sm font-medium text-gray-900">
                {recoveryInfo.step}
              </span>
            </div>
            
            {recoveryInfo.barcode && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">条形码:</span>
                <span className="text-sm font-mono text-gray-900">
                  {recoveryInfo.barcode}
                </span>
              </div>
            )}
            
            {recoveryInfo.timestamp && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">时间:</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {formatTime(recoveryInfo.timestamp)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleRecover}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>继续任务</span>
          </button>
          
          <button
            onClick={handleDecline}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            开始新任务
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          选择"开始新任务"将清除当前未完成的任务数据
        </p>
      </div>
    </div>
  )
}

/**
 * 简化的恢复横幅组件
 */
export function RecoveryBanner() {
  const { showPrompt, recoveryInfo, handleRecover, handleDecline } = useRecoveryPrompt()

  if (!showPrompt || !recoveryInfo) {
    return null
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <RotateCcw className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              检测到未完成的质检任务
            </p>
            <p className="text-sm text-blue-600">
              {recoveryInfo.step} - {recoveryInfo.barcode}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRecover}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            继续
          </button>
          <button
            onClick={handleDecline}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            忽略
          </button>
        </div>
      </div>
    </div>
  )
}