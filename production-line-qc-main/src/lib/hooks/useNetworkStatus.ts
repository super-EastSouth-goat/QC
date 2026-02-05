'use client'

import { useState, useEffect, useCallback } from 'react'
import { networkService, NetworkStatus, NetworkEvent, OfflineQueueItem } from '../services/networkService'
import { useToast } from '@/components/error/Toast'

export interface NetworkHookOptions {
  showOfflineToast?: boolean
  showOnlineToast?: boolean
  showSlowConnectionWarning?: boolean
  autoRetryOfflineRequests?: boolean
}

/**
 * 网络状态监控Hook
 * 需求: 8.1 - 网络连接状态检测和离线模式处理
 */
export function useNetworkStatus(options: NetworkHookOptions = {}) {
  const {
    showOfflineToast = true,
    showOnlineToast = true,
    showSlowConnectionWarning = true,
    autoRetryOfflineRequests = true
  } = options

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkService.getStatus()
  )
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(
    networkService.getOfflineQueue()
  )
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false)

  const { showError, showSuccess, showWarning, showInfo } = useToast()

  /**
   * 处理网络状态变化
   */
  const handleStatusChange = useCallback((status: NetworkStatus) => {
    setNetworkStatus(status)
  }, [])

  /**
   * 处理网络事件
   */
  const handleNetworkEvent = useCallback((event: NetworkEvent) => {
    switch (event.type) {
      case 'offline':
        if (showOfflineToast && !hasShownOfflineToast) {
          showError(
            '网络连接已断开，部分功能可能无法使用。数据将在网络恢复后自动同步。',
            '网络离线'
          )
          setHasShownOfflineToast(true)
        }
        break

      case 'online':
        if (showOnlineToast && hasShownOfflineToast) {
          showSuccess('网络连接已恢复', '网络在线')
          setHasShownOfflineToast(false)
        }
        
        if (autoRetryOfflineRequests) {
          const queueLength = networkService.getOfflineQueue().length
          if (queueLength > 0) {
            showInfo(
              `正在同步 ${queueLength} 个离线操作...`,
              '数据同步'
            )
          }
        }
        break

      case 'change':
        if (showSlowConnectionWarning && networkService.isSlowConnection()) {
          showWarning(
            '检测到网络连接较慢，建议在网络环境较好时使用',
            '网络较慢'
          )
        }
        break
    }

    // 更新离线队列状态
    setOfflineQueue(networkService.getOfflineQueue())
  }, [
    showOfflineToast,
    showOnlineToast,
    showSlowConnectionWarning,
    autoRetryOfflineRequests,
    hasShownOfflineToast,
    showError,
    showSuccess,
    showWarning,
    showInfo
  ])

  /**
   * 添加到离线队列
   */
  const addToOfflineQueue = useCallback((
    type: OfflineQueueItem['type'],
    data: any,
    url: string,
    method: string = 'POST',
    headers?: Record<string, string>,
    maxRetries: number = 3
  ): string => {
    const id = networkService.addToOfflineQueue({
      type,
      data,
      url,
      method,
      headers,
      maxRetries
    })
    
    setOfflineQueue(networkService.getOfflineQueue())
    
    showInfo(
      '操作已添加到离线队列，将在网络恢复后自动执行',
      '离线模式'
    )
    
    return id
  }, [showInfo])

  /**
   * 从离线队列移除
   */
  const removeFromOfflineQueue = useCallback((id: string) => {
    networkService.removeFromOfflineQueue(id)
    setOfflineQueue(networkService.getOfflineQueue())
  }, [])

  /**
   * 清空离线队列
   */
  const clearOfflineQueue = useCallback(() => {
    networkService.clearOfflineQueue()
    setOfflineQueue([])
  }, [])

  /**
   * 获取网络质量描述
   */
  const getNetworkQuality = useCallback(() => {
    return networkService.getNetworkQualityDescription()
  }, [])

  /**
   * 获取网络统计
   */
  const getNetworkStats = useCallback(() => {
    return networkService.getNetworkStats()
  }, [])

  /**
   * 执行网络请求（带离线队列支持）
   */
  const fetchWithOfflineSupport = useCallback(async (
    url: string,
    options: RequestInit = {},
    queueOptions?: {
      type: OfflineQueueItem['type']
      maxRetries?: number
    }
  ): Promise<Response> => {
    if (!networkStatus.isOnline && queueOptions) {
      // 离线时添加到队列
      addToOfflineQueue(
        queueOptions.type,
        options.body ? JSON.parse(options.body as string) : null,
        url,
        options.method || 'GET',
        options.headers as Record<string, string>,
        queueOptions.maxRetries
      )
      
      throw new Error('网络离线，请求已添加到离线队列')
    }

    return fetch(url, options)
  }, [networkStatus.isOnline, addToOfflineQueue])

  // 监听网络状态变化
  useEffect(() => {
    const unsubscribeStatus = networkService.onStatusChange(handleStatusChange)
    const unsubscribeEvents = networkService.onNetworkEvent(handleNetworkEvent)

    return () => {
      unsubscribeStatus()
      unsubscribeEvents()
    }
  }, [handleStatusChange, handleNetworkEvent])

  // 定期更新离线队列状态
  useEffect(() => {
    const interval = setInterval(() => {
      setOfflineQueue(networkService.getOfflineQueue())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    // 网络状态
    isOnline: networkStatus.isOnline,
    isSlowConnection: networkService.isSlowConnection(),
    isDataSaverEnabled: networkService.isDataSaverEnabled(),
    networkStatus,
    networkQuality: getNetworkQuality(),
    
    // 离线队列
    offlineQueue,
    hasOfflineItems: offlineQueue.length > 0,
    
    // 方法
    addToOfflineQueue,
    removeFromOfflineQueue,
    clearOfflineQueue,
    getNetworkStats,
    fetchWithOfflineSupport,
    
    // 工具方法
    refresh: () => setNetworkStatus(networkService.getStatus())
  }
}

/**
 * 简化的网络状态Hook（只返回基本状态）
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(networkService.isOnline())

  useEffect(() => {
    const unsubscribe = networkService.onStatusChange((status) => {
      setIsOnline(status.isOnline)
    })

    return unsubscribe
  }, [])

  return isOnline
}

/**
 * 网络质量Hook
 */
export function useNetworkQuality() {
  const [quality, setQuality] = useState(networkService.getNetworkQualityDescription())
  const [isSlowConnection, setIsSlowConnection] = useState(networkService.isSlowConnection())

  useEffect(() => {
    const unsubscribe = networkService.onStatusChange(() => {
      setQuality(networkService.getNetworkQualityDescription())
      setIsSlowConnection(networkService.isSlowConnection())
    })

    return unsubscribe
  }, [])

  return {
    quality,
    isSlowConnection,
    shouldOptimizeForSlowConnection: isSlowConnection
  }
}

/**
 * 离线队列Hook
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>(networkService.getOfflineQueue())

  const addToQueue = useCallback((
    type: OfflineQueueItem['type'],
    data: any,
    url: string,
    method: string = 'POST',
    headers?: Record<string, string>,
    maxRetries: number = 3
  ) => {
    const id = networkService.addToOfflineQueue({
      type,
      data,
      url,
      method,
      headers,
      maxRetries
    })
    
    setQueue(networkService.getOfflineQueue())
    return id
  }, [])

  const removeFromQueue = useCallback((id: string) => {
    networkService.removeFromOfflineQueue(id)
    setQueue(networkService.getOfflineQueue())
  }, [])

  const clearQueue = useCallback(() => {
    networkService.clearOfflineQueue()
    setQueue([])
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(networkService.getOfflineQueue())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    queue,
    hasItems: queue.length > 0,
    itemCount: queue.length,
    addToQueue,
    removeFromQueue,
    clearQueue
  }
}