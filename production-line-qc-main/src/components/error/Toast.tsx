'use client'

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  showError: (message: string, title?: string, action?: Toast['action']) => void
  showSuccess: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  hideToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | null>(null)

/**
 * Toast通知提供者
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (toast: Omit<Toast, 'id'>) => {
    setToasts(prev => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? 5000
      }

      // 自动移除toast
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          hideToast(id)
        }, newToast.duration)
      }

      return [...prev, newToast]
    })
  }

  const showError = (message: string, title = '错误', action?: Toast['action']) => {
    showToast({
      type: 'error',
      title,
      message,
      duration: 8000, // 错误消息显示更长时间
      action
    })
  }

  const showSuccess = (message: string, title = '成功') => {
    showToast({
      type: 'success',
      title,
      message,
      duration: 4000
    })
  }

  const showWarning = (message: string, title = '警告') => {
    showToast({
      type: 'warning',
      title,
      message,
      duration: 6000
    })
  }

  const showInfo = (message: string, title = '提示') => {
    showToast({
      type: 'info',
      title,
      message,
      duration: 5000
    })
  }

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const clearAll = () => {
    setToasts([])
  }

  return (
    <ToastContext.Provider value={{
      showToast,
      showError,
      showSuccess,
      showWarning,
      showInfo,
      hideToast,
      clearAll
    }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  )
}

/**
 * Toast容器组件
 */
function ToastContainer({ 
  toasts, 
  onHide 
}: { 
  toasts: Toast[]
  onHide: (id: string) => void 
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onHide={onHide} />
      ))}
    </div>
  )
}

/**
 * 单个Toast项组件
 */
function ToastItem({ 
  toast, 
  onHide 
}: { 
  toast: Toast
  onHide: (id: string) => void 
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // 进入动画
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleHide = () => {
    setIsLeaving(true)
    setTimeout(() => onHide(toast.id), 300) // 等待退出动画完成
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getColorClasses()}
        border rounded-lg shadow-lg p-4 relative
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="mt-1 text-sm text-gray-600">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <div className="mt-2">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={handleHide}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * 使用Toast的Hook
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * 错误处理Hook，结合Toast显示
 */
export function useErrorHandler() {
  const { showError } = useToast()

  return {
    handleError: (
      error: Error,
      title?: string,
      onRetry?: () => void
    ) => {
      console.error('Error handled by useErrorHandler:', error)
      
      showError(
        error.message,
        title,
        onRetry ? {
          label: '重试',
          onClick: onRetry
        } : undefined
      )
    },
    
    handleApiError: (
      error: Error,
      endpoint?: string,
      onRetry?: () => void
    ) => {
      const title = endpoint ? `API错误 (${endpoint})` : 'API错误'
      showError(
        error.message || '服务器响应异常，请稍后重试',
        title,
        onRetry ? {
          label: '重试',
          onClick: onRetry
        } : undefined
      )
    },
    
    handleNetworkError: (
      error: Error,
      onRetry?: () => void
    ) => {
      showError(
        '网络连接出现问题，请检查网络设置',
        '网络错误',
        onRetry ? {
          label: '重试',
          onClick: onRetry
        } : undefined
      )
    },
    
    handleCameraError: (error: Error) => {
      let message = '相机访问失败'
      
      if (error.name === 'NotAllowedError') {
        message = '相机权限被拒绝，请在浏览器设置中允许相机访问'
      } else if (error.name === 'NotFoundError') {
        message = '未找到可用的相机设备'
      } else if (error.name === 'NotSupportedError') {
        message = '当前浏览器不支持相机功能'
      }
      
      showError(message, '相机错误')
    },
    
    handleUploadError: (
      error: Error,
      fileName?: string,
      onRetry?: () => void
    ) => {
      const message = fileName 
        ? `文件 "${fileName}" 上传失败：${error.message}`
        : `文件上传失败：${error.message}`
      
      showError(
        message,
        '上传错误',
        onRetry ? {
          label: '重试上传',
          onClick: onRetry
        } : undefined
      )
    }
  }
}