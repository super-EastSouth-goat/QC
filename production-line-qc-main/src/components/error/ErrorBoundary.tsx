'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * 全局错误边界组件
 * 需求: 8.1, 8.2, 8.4 - 错误处理和用户友好的错误显示
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 记录错误到日志系统
    this.logError(error, errorInfo)

    // 调用外部错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * 记录错误信息
   */
  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // 记录到控制台
    console.error('ErrorBoundary caught an error:', errorData)

    // 记录到本地存储（用于调试）
    try {
      const existingErrors = JSON.parse(localStorage.getItem('qc_error_logs') || '[]')
      existingErrors.push(errorData)
      
      // 只保留最近50个错误
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50)
      }
      
      localStorage.setItem('qc_error_logs', JSON.stringify(existingErrors))
    } catch (storageError) {
      console.error('Failed to save error to localStorage:', storageError)
    }

    // 在生产环境中，这里可以发送错误到远程日志服务
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToService(errorData)
    }
  }

  /**
   * 发送错误到远程服务（生产环境）
   */
  private async sendErrorToService(errorData: any) {
    try {
      // 这里可以集成第三方错误监控服务，如 Sentry
      // 或者发送到自己的错误收集API
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      })
    } catch (error) {
      console.error('Failed to send error to service:', error)
    }
  }

  /**
   * 重置错误状态
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  /**
   * 刷新页面
   */
  private handleRefresh = () => {
    window.location.reload()
  }

  /**
   * 返回首页
   */
  private handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              系统出现错误
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              很抱歉，系统遇到了一个意外错误。请尝试刷新页面或返回首页。
            </p>

            {/* 错误详情（仅在开发环境显示） */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 bg-gray-100 rounded text-sm">
                <p className="font-medium text-gray-900 mb-1">错误信息:</p>
                <p className="text-red-600 font-mono text-xs break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-700">
                      查看详细堆栈
                    </summary>
                    <pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col space-y-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </button>
              
              <button
                onClick={this.handleRefresh}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新页面
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                如果问题持续存在，请联系技术支持
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 错误边界Hook版本（用于函数组件）
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Unhandled error:', error, errorInfo)
    
    // 记录错误
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    try {
      const existingErrors = JSON.parse(localStorage.getItem('qc_error_logs') || '[]')
      existingErrors.push(errorData)
      
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50)
      }
      
      localStorage.setItem('qc_error_logs', JSON.stringify(existingErrors))
    } catch (storageError) {
      console.error('Failed to save error to localStorage:', storageError)
    }
  }
}