import { createClient } from '../supabase/client'

export interface ErrorLog {
  id?: string
  user_id?: string
  error_type: 'javascript' | 'api' | 'network' | 'camera' | 'upload' | 'auth' | 'unknown'
  message: string
  stack?: string
  component_stack?: string
  url: string
  user_agent: string
  timestamp: string
  context?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface NetworkStatus {
  isOnline: boolean
  effectiveType?: string
  downlink?: number
  rtt?: number
}

/**
 * 错误日志和监控服务
 * 需求: 8.1, 8.2, 8.4 - 错误处理、日志记录和用户友好的错误显示
 */
export class ErrorService {
  private supabase = createClient()
  private isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' || 
                      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://demo.supabase.co'

  /**
   * 记录错误到数据库和本地存储
   */
  async logError(error: ErrorLog): Promise<void> {
    try {
      // 记录到本地存储
      this.logErrorLocally(error)

      // 如果不是演示模式，记录到数据库
      if (!this.isDemoMode) {
        await this.logErrorToDatabase(error)
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  /**
   * 记录错误到本地存储
   */
  private logErrorLocally(error: ErrorLog): void {
    try {
      const existingErrors = JSON.parse(localStorage.getItem('qc_error_logs') || '[]')
      existingErrors.push({
        ...error,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
      
      // 只保留最近100个错误
      if (existingErrors.length > 100) {
        existingErrors.splice(0, existingErrors.length - 100)
      }
      
      localStorage.setItem('qc_error_logs', JSON.stringify(existingErrors))
    } catch (storageError) {
      console.error('Failed to save error to localStorage:', storageError)
    }
  }

  /**
   * 记录错误到数据库
   */
  private async logErrorToDatabase(error: ErrorLog): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      const errorData = {
        user_id: user?.id || null,
        error_type: error.error_type,
        message: error.message,
        stack: error.stack,
        component_stack: error.component_stack,
        url: error.url,
        user_agent: error.user_agent,
        timestamp: error.timestamp,
        context: error.context,
        severity: error.severity
      }

      // 注意：这里假设有一个error_logs表，实际项目中需要创建这个表
      // 由于当前数据库schema中没有这个表，我们先记录到job_events表作为替代
      if (user) {
        await this.supabase
          .from('job_events')
          .insert({
            job_id: 'system-error', // 使用特殊的job_id标识系统错误
            event: 'system_error',
            detail: errorData
          })
      }
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError)
    }
  }

  /**
   * 获取本地错误日志
   */
  getLocalErrorLogs(): ErrorLog[] {
    try {
      return JSON.parse(localStorage.getItem('qc_error_logs') || '[]')
    } catch (error) {
      console.error('Failed to get local error logs:', error)
      return []
    }
  }

  /**
   * 清除本地错误日志
   */
  clearLocalErrorLogs(): void {
    try {
      localStorage.removeItem('qc_error_logs')
    } catch (error) {
      console.error('Failed to clear local error logs:', error)
    }
  }

  /**
   * 创建标准化的错误对象
   */
  createErrorLog(
    error: Error,
    type: ErrorLog['error_type'] = 'unknown',
    severity: ErrorLog['severity'] = 'medium',
    context?: Record<string, any>
  ): ErrorLog {
    return {
      error_type: type,
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      context,
      severity
    }
  }

  /**
   * 处理API错误
   */
  async handleApiError(
    error: Error,
    endpoint: string,
    requestData?: any
  ): Promise<void> {
    const errorLog = this.createErrorLog(error, 'api', 'high', {
      endpoint,
      requestData: requestData ? JSON.stringify(requestData) : undefined
    })

    await this.logError(errorLog)
  }

  /**
   * 处理网络错误
   */
  async handleNetworkError(error: Error, context?: Record<string, any>): Promise<void> {
    const errorLog = this.createErrorLog(error, 'network', 'high', {
      ...context,
      networkStatus: this.getNetworkStatus()
    })

    await this.logError(errorLog)
  }

  /**
   * 处理相机错误
   */
  async handleCameraError(error: Error, context?: Record<string, any>): Promise<void> {
    const errorLog = this.createErrorLog(error, 'camera', 'medium', context)
    await this.logError(errorLog)
  }

  /**
   * 处理上传错误
   */
  async handleUploadError(
    error: Error,
    fileName?: string,
    fileSize?: number
  ): Promise<void> {
    const errorLog = this.createErrorLog(error, 'upload', 'high', {
      fileName,
      fileSize
    })

    await this.logError(errorLog)
  }

  /**
   * 处理认证错误
   */
  async handleAuthError(error: Error, context?: Record<string, any>): Promise<void> {
    const errorLog = this.createErrorLog(error, 'auth', 'critical', context)
    await this.logError(errorLog)
  }

  /**
   * 获取网络状态信息
   */
  getNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    return {
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt
    }
  }

  /**
   * 监听网络状态变化
   */
  onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void {
    const handleOnline = () => callback(this.getNetworkStatus())
    const handleOffline = () => callback(this.getNetworkStatus())

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 返回清理函数
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(error: Error, type: ErrorLog['error_type']): string {
    const commonMessages: Record<string, string> = {
      network: '网络连接出现问题，请检查网络设置后重试',
      api: '服务器响应异常，请稍后重试',
      camera: '相机访问失败，请检查相机权限设置',
      upload: '文件上传失败，请检查网络连接后重试',
      auth: '身份验证失败，请重新登录',
      unknown: '系统出现未知错误，请刷新页面后重试'
    }

    // 特定错误消息映射
    const specificMessages: Record<string, string> = {
      'Failed to fetch': '网络连接失败，请检查网络设置',
      'NetworkError': '网络错误，请检查网络连接',
      'AbortError': '请求超时，请重试',
      'NotAllowedError': '权限被拒绝，请检查浏览器权限设置',
      'NotFoundError': '未找到指定的设备或资源',
      'NotSupportedError': '当前浏览器不支持此功能',
      'OverconstrainedError': '设备不满足指定的约束条件'
    }

    // 首先尝试匹配特定错误消息
    for (const [key, message] of Object.entries(specificMessages)) {
      if (error.message.includes(key) || error.name === key) {
        return message
      }
    }

    // 返回通用错误消息
    return commonMessages[type] || commonMessages.unknown
  }

  /**
   * 显示用户友好的错误提示
   */
  showUserFriendlyError(
    error: Error,
    type: ErrorLog['error_type'] = 'unknown',
    onRetry?: () => void
  ): void {
    const message = this.getUserFriendlyMessage(error, type)
    
    // 这里可以集成toast通知组件
    // 暂时使用console.error和alert作为示例
    console.error('User-friendly error:', message)
    
    if (typeof window !== 'undefined') {
      // 在实际项目中，这里应该使用toast组件而不是alert
      if (onRetry) {
        const retry = confirm(`${message}\n\n是否重试？`)
        if (retry) {
          onRetry()
        }
      } else {
        alert(message)
      }
    }
  }

  /**
   * 检查是否为关键错误（需要立即处理）
   */
  isCriticalError(error: Error, type: ErrorLog['error_type']): boolean {
    const criticalTypes: ErrorLog['error_type'][] = ['auth', 'api']
    const criticalMessages = [
      'Authentication failed',
      'Unauthorized',
      'Forbidden',
      'Internal Server Error'
    ]

    if (criticalTypes.includes(type)) {
      return true
    }

    return criticalMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }

  /**
   * 获取错误统计信息
   */
  getErrorStatistics(): {
    total: number
    byType: Record<ErrorLog['error_type'], number>
    bySeverity: Record<ErrorLog['severity'], number>
    recent: number // 最近1小时的错误数
  } {
    const logs = this.getLocalErrorLogs()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const stats = {
      total: logs.length,
      byType: {} as Record<ErrorLog['error_type'], number>,
      bySeverity: {} as Record<ErrorLog['severity'], number>,
      recent: logs.filter(log => log.timestamp > oneHourAgo).length
    }

    logs.forEach(log => {
      stats.byType[log.error_type] = (stats.byType[log.error_type] || 0) + 1
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1
    })

    return stats
  }
}

// 导出单例实例
export const errorService = new ErrorService()

// 全局错误处理器
if (typeof window !== 'undefined') {
  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    errorService.logError(errorService.createErrorLog(error, 'javascript', 'high', {
      type: 'unhandledrejection'
    }))
  })

  // 捕获全局JavaScript错误
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message)
    errorService.logError(errorService.createErrorLog(error, 'javascript', 'high', {
      type: 'global_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }))
  })
}