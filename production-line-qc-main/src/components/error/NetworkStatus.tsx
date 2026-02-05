'use client'

import React, { useState } from 'react'
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'
import { useNetworkStatus, useOfflineQueue } from '@/lib/hooks/useNetworkStatus'

/**
 * 网络状态指示器组件
 * 需求: 8.1 - 网络连接状态检测和离线模式处理
 */
export function NetworkStatusIndicator() {
  const { 
    isOnline, 
    isSlowConnection, 
    networkQuality, 
    networkStatus 
  } = useNetworkStatus({
    showOfflineToast: false, // 由指示器自己处理显示
    showOnlineToast: false,
    showSlowConnectionWarning: false
  })

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />
    }

    if (isSlowConnection) {
      return <SignalLow className="w-4 h-4 text-yellow-500" />
    }

    const { effectiveType } = networkStatus
    switch (effectiveType) {
      case '4g':
        return <SignalHigh className="w-4 h-4 text-green-500" />
      case '3g':
        return <SignalMedium className="w-4 h-4 text-blue-500" />
      case '2g':
      case 'slow-2g':
        return <SignalLow className="w-4 h-4 text-yellow-500" />
      default:
        return <Wifi className="w-4 h-4 text-green-500" />
    }
  }

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600'
    if (isSlowConnection) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="flex items-center space-x-2">
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {networkQuality}
      </span>
    </div>
  )
}

/**
 * 详细的网络状态面板
 */
export function NetworkStatusPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { 
    isOnline, 
    isSlowConnection, 
    isDataSaverEnabled,
    networkStatus, 
    networkQuality,
    getNetworkStats
  } = useNetworkStatus()

  const stats = getNetworkStats()

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return 'N/A'
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center space-x-3">
          <NetworkStatusIndicator />
          <span className="text-sm text-gray-600">
            网络状态
          </span>
        </div>
        <RefreshCw className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">状态:</span>
                <span className={`ml-2 font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? '在线' : '离线'}
                </span>
              </div>
              
              <div>
                <span className="text-gray-500">质量:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {networkQuality}
                </span>
              </div>

              {networkStatus.effectiveType && (
                <div>
                  <span className="text-gray-500">连接类型:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {networkStatus.effectiveType.toUpperCase()}
                  </span>
                </div>
              )}

              {networkStatus.downlink && (
                <div>
                  <span className="text-gray-500">下行带宽:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {networkStatus.downlink.toFixed(1)} Mbps
                  </span>
                </div>
              )}

              {networkStatus.rtt && (
                <div>
                  <span className="text-gray-500">延迟:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {networkStatus.rtt} ms
                  </span>
                </div>
              )}

              <div>
                <span className="text-gray-500">在线率:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {stats.uptime.toFixed(1)}%
                </span>
              </div>
            </div>

            {(isSlowConnection || isDataSaverEnabled) && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    {isSlowConnection && '网络连接较慢'}
                    {isSlowConnection && isDataSaverEnabled && '，'}
                    {isDataSaverEnabled && '数据节省模式已启用'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 离线队列状态组件
 */
export function OfflineQueueStatus() {
  const { queue, hasItems, itemCount, clearQueue } = useOfflineQueue()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!hasItems) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100"
      >
        <div className="flex items-center space-x-3">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            离线队列 ({itemCount} 项)
          </span>
        </div>
        <RefreshCw className={`w-4 h-4 text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-blue-200">
          <div className="space-y-2 mt-3">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {item.type === 'api_call' && 'API调用'}
                    {item.type === 'upload' && '文件上传'}
                    {item.type === 'job_update' && '任务更新'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.method} {item.url}
                  </div>
                  <div className="text-xs text-gray-400">
                    重试: {item.retryCount}/{item.maxRetries}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {item.retryCount < item.maxRetries ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-blue-200">
            <button
              onClick={clearQueue}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              清空队列
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 网络状态横幅（用于显示重要的网络状态变化）
 */
export function NetworkStatusBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const { isOnline, isSlowConnection } = useNetworkStatus({
    showOfflineToast: false,
    showOnlineToast: false,
    showSlowConnectionWarning: false
  })

  // 只在离线或网络很慢时显示
  if (isVisible && (isOnline && !isSlowConnection)) {
    return null
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={`${
      !isOnline ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    } border-l-4 p-4 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {!isOnline ? (
            <WifiOff className="w-5 h-5 text-red-600" />
          ) : (
            <SignalLow className="w-5 h-5 text-yellow-600" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              !isOnline ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {!isOnline ? '网络连接已断开' : '网络连接较慢'}
            </p>
            <p className={`text-sm ${
              !isOnline ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {!isOnline 
                ? '部分功能可能无法使用，数据将在网络恢复后自动同步'
                : '建议在网络环境较好时使用，以获得更好的体验'
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className={`${
            !isOnline ? 'text-red-400 hover:text-red-600' : 'text-yellow-400 hover:text-yellow-600'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}