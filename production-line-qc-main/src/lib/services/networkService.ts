/**
 * 网络状态监控服务
 * 需求: 8.1 - 网络连接状态检测和离线模式处理
 */

export interface NetworkStatus {
  isOnline: boolean
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
  downlink?: number // Mbps
  rtt?: number // ms
  saveData?: boolean
  timestamp: string
}

export interface NetworkEvent {
  type: 'online' | 'offline' | 'change'
  status: NetworkStatus
  timestamp: string
}

export interface OfflineQueueItem {
  id: string
  type: 'api_call' | 'upload' | 'job_update'
  data: any
  url: string
  method: string
  headers?: Record<string, string>
  timestamp: string
  retryCount: number
  maxRetries: number
}

/**
 * 网络监控服务
 */
export class NetworkService {
  private listeners: Array<(status: NetworkStatus) => void> = []
  private eventListeners: Array<(event: NetworkEvent) => void> = []
  private currentStatus: NetworkStatus
  private offlineQueue: OfflineQueueItem[] = []
  private isProcessingQueue = false
  private healthCheckInterval?: NodeJS.Timeout
  private readonly OFFLINE_QUEUE_KEY = 'qc_offline_queue'
  private readonly NETWORK_HISTORY_KEY = 'qc_network_history'

  constructor() {
    this.currentStatus = this.getCurrentNetworkStatus()
    this.initializeNetworkMonitoring()
    this.loadOfflineQueue()
  }

  /**
   * 获取当前网络状态
   */
  getCurrentNetworkStatus(): NetworkStatus {
    const connection = this.getConnection()
    
    return {
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType as NetworkStatus['effectiveType'],
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 获取网络连接对象
   */
  private getConnection(): any {
    return (navigator as any).connection || 
           (navigator as any).mozConnection || 
           (navigator as any).webkitConnection
  }

  /**
   * 初始化网络监控
   */
  private initializeNetworkMonitoring(): void {
    if (typeof window === 'undefined') return

    // 监听在线/离线事件
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // 监听网络连接变化
    const connection = this.getConnection()
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange)
    }

    // 定期健康检查
    this.startHealthCheck()
  }

  /**
   * 处理上线事件
   */
  private handleOnline = () => {
    const newStatus = this.getCurrentNetworkStatus()
    this.updateStatus(newStatus)
    
    const event: NetworkEvent = {
      type: 'online',
      status: newStatus,
      timestamp: new Date().toISOString()
    }
    
    this.notifyEventListeners(event)
    this.processOfflineQueue()
  }

  /**
   * 处理离线事件
   */
  private handleOffline = () => {
    const newStatus = this.getCurrentNetworkStatus()
    this.updateStatus(newStatus)
    
    const event: NetworkEvent = {
      type: 'offline',
      status: newStatus,
      timestamp: new Date().toISOString()
    }
    
    this.notifyEventListeners(event)
  }

  /**
   * 处理连接变化
   */
  private handleConnectionChange = () => {
    const newStatus = this.getCurrentNetworkStatus()
    
    // 只有在状态真正改变时才通知
    if (this.hasStatusChanged(this.currentStatus, newStatus)) {
      this.updateStatus(newStatus)
      
      const event: NetworkEvent = {
        type: 'change',
        status: newStatus,
        timestamp: new Date().toISOString()
      }
      
      this.notifyEventListeners(event)
    }
  }

  /**
   * 检查状态是否改变
   */
  private hasStatusChanged(oldStatus: NetworkStatus, newStatus: NetworkStatus): boolean {
    return (
      oldStatus.isOnline !== newStatus.isOnline ||
      oldStatus.effectiveType !== newStatus.effectiveType ||
      Math.abs((oldStatus.downlink || 0) - (newStatus.downlink || 0)) > 0.5 ||
      Math.abs((oldStatus.rtt || 0) - (newStatus.rtt || 0)) > 50
    )
  }

  /**
   * 更新状态
   */
  private updateStatus(status: NetworkStatus): void {
    this.currentStatus = status
    this.saveNetworkHistory(status)
    this.notifyListeners(status)
  }

  /**
   * 开始健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (navigator.onLine) {
        const isActuallyOnline = await this.performHealthCheck()
        if (!isActuallyOnline && this.currentStatus.isOnline) {
          // 浏览器认为在线，但实际无法连接
          this.handleOffline()
        }
      }
    }, 30000) // 每30秒检查一次
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * 获取网络状态
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus }
  }

  /**
   * 检查是否在线
   */
  isOnline(): boolean {
    return this.currentStatus.isOnline
  }

  /**
   * 检查是否为慢速连接
   */
  isSlowConnection(): boolean {
    const { effectiveType, downlink } = this.currentStatus
    return (
      effectiveType === 'slow-2g' ||
      effectiveType === '2g' ||
      (downlink !== undefined && downlink < 1)
    )
  }

  /**
   * 检查是否启用了数据节省模式
   */
  isDataSaverEnabled(): boolean {
    return this.currentStatus.saveData === true
  }

  /**
   * 监听网络状态变化
   */
  onStatusChange(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener)
    
    // 立即调用一次，提供当前状态
    listener(this.currentStatus)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 监听网络事件
   */
  onNetworkEvent(listener: (event: NetworkEvent) => void): () => void {
    this.eventListeners.push(listener)
    
    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * 通知状态监听器
   */
  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('Error in network status listener:', error)
      }
    })
  }

  /**
   * 通知事件监听器
   */
  private notifyEventListeners(event: NetworkEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in network event listener:', error)
      }
    })
  }

  /**
   * 添加到离线队列
   */
  addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): string {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0
    }

    this.offlineQueue.push(queueItem)
    this.saveOfflineQueue()
    
    return queueItem.id
  }

  /**
   * 从离线队列移除项目
   */
  removeFromOfflineQueue(id: string): void {
    this.offlineQueue = this.offlineQueue.filter(item => item.id !== id)
    this.saveOfflineQueue()
  }

  /**
   * 获取离线队列
   */
  getOfflineQueue(): OfflineQueueItem[] {
    return [...this.offlineQueue]
  }

  /**
   * 清空离线队列
   */
  clearOfflineQueue(): void {
    this.offlineQueue = []
    this.saveOfflineQueue()
  }

  /**
   * 处理离线队列
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline() || this.offlineQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      const itemsToProcess = [...this.offlineQueue]
      
      for (const item of itemsToProcess) {
        try {
          await this.processOfflineItem(item)
          this.removeFromOfflineQueue(item.id)
        } catch (error) {
          console.error('Failed to process offline item:', error)
          
          // 增加重试次数
          item.retryCount++
          
          if (item.retryCount >= item.maxRetries) {
            // 达到最大重试次数，移除项目
            this.removeFromOfflineQueue(item.id)
          }
        }
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * 处理单个离线项目
   */
  private async processOfflineItem(item: OfflineQueueItem): Promise<void> {
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
        ...item.headers
      },
      body: item.method !== 'GET' ? JSON.stringify(item.data) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * 保存离线队列到本地存储
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  /**
   * 从本地存储加载离线队列
   */
  private loadOfflineQueue(): void {
    try {
      const queueJson = localStorage.getItem(this.OFFLINE_QUEUE_KEY)
      if (queueJson) {
        this.offlineQueue = JSON.parse(queueJson)
        
        // 清理过期项目（超过24小时）
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        this.offlineQueue = this.offlineQueue.filter(item => {
          const itemTime = new Date(item.timestamp).getTime()
          return itemTime > oneDayAgo
        })
        
        this.saveOfflineQueue()
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.offlineQueue = []
    }
  }

  /**
   * 保存网络历史
   */
  private saveNetworkHistory(status: NetworkStatus): void {
    try {
      const historyJson = localStorage.getItem(this.NETWORK_HISTORY_KEY)
      const history: NetworkStatus[] = historyJson ? JSON.parse(historyJson) : []
      
      history.push(status)
      
      // 只保留最近100条记录
      if (history.length > 100) {
        history.splice(0, history.length - 100)
      }
      
      localStorage.setItem(this.NETWORK_HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save network history:', error)
    }
  }

  /**
   * 获取网络历史
   */
  getNetworkHistory(): NetworkStatus[] {
    try {
      const historyJson = localStorage.getItem(this.NETWORK_HISTORY_KEY)
      return historyJson ? JSON.parse(historyJson) : []
    } catch (error) {
      console.error('Failed to get network history:', error)
      return []
    }
  }

  /**
   * 获取网络统计信息
   */
  getNetworkStats(): {
    uptime: number // 在线时间百分比
    averageDownlink?: number
    averageRtt?: number
    connectionChanges: number
  } {
    const history = this.getNetworkHistory()
    
    if (history.length === 0) {
      return {
        uptime: this.isOnline() ? 100 : 0,
        connectionChanges: 0
      }
    }

    const onlineCount = history.filter(status => status.isOnline).length
    const uptime = (onlineCount / history.length) * 100

    const downlinkValues = history
      .filter(status => status.downlink !== undefined)
      .map(status => status.downlink!)
    
    const rttValues = history
      .filter(status => status.rtt !== undefined)
      .map(status => status.rtt!)

    const averageDownlink = downlinkValues.length > 0
      ? downlinkValues.reduce((sum, val) => sum + val, 0) / downlinkValues.length
      : undefined

    const averageRtt = rttValues.length > 0
      ? rttValues.reduce((sum, val) => sum + val, 0) / rttValues.length
      : undefined

    // 计算连接变化次数
    let connectionChanges = 0
    for (let i = 1; i < history.length; i++) {
      if (history[i].isOnline !== history[i - 1].isOnline) {
        connectionChanges++
      }
    }

    return {
      uptime,
      averageDownlink,
      averageRtt,
      connectionChanges
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (typeof window === 'undefined') return

    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)

    const connection = this.getConnection()
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange)
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.listeners = []
    this.eventListeners = []
  }

  /**
   * 获取网络质量描述
   */
  getNetworkQualityDescription(): string {
    const { isOnline, effectiveType, downlink, rtt } = this.currentStatus

    if (!isOnline) {
      return '离线'
    }

    if (effectiveType === 'slow-2g') {
      return '网络很慢'
    } else if (effectiveType === '2g') {
      return '网络较慢'
    } else if (effectiveType === '3g') {
      return '网络一般'
    } else if (effectiveType === '4g') {
      return '网络良好'
    }

    // 基于带宽和延迟判断
    if (downlink !== undefined && rtt !== undefined) {
      if (downlink > 10 && rtt < 100) {
        return '网络优秀'
      } else if (downlink > 5 && rtt < 200) {
        return '网络良好'
      } else if (downlink > 1 && rtt < 500) {
        return '网络一般'
      } else {
        return '网络较慢'
      }
    }

    return '在线'
  }
}

// 导出单例实例
export const networkService = new NetworkService()

// 页面卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    networkService.cleanup()
  })
}