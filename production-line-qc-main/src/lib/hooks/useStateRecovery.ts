'use client'

import { useState, useEffect, useCallback } from 'react'
import { stateService, QCState, UserPreferences } from '../services/stateService'
import { useToast } from '@/components/error/Toast'

export interface StateRecoveryOptions {
  autoRecover?: boolean
  showRecoveryPrompt?: boolean
  onStateRecovered?: (state: QCState) => void
  onRecoveryDeclined?: () => void
}

/**
 * 状态恢复Hook
 * 需求: 8.5 - 页面刷新后状态恢复
 */
export function useStateRecovery(options: StateRecoveryOptions = {}) {
  const {
    autoRecover = false,
    showRecoveryPrompt = true,
    onStateRecovered,
    onRecoveryDeclined
  } = options

  const [currentState, setCurrentState] = useState<QCState | null>(null)
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(
    stateService.getUserPreferences()
  )
  const [isRecovering, setIsRecovering] = useState(false)
  const [hasCheckedRecovery, setHasCheckedRecovery] = useState(false)

  const { showInfo } = useToast()

  /**
   * 检查并处理状态恢复
   */
  const checkRecovery = useCallback(async () => {
    if (hasCheckedRecovery) return

    setHasCheckedRecovery(true)
    
    const recoveryInfo = stateService.getRecoveryInfo()
    
    if (!recoveryInfo.hasState || !recoveryInfo.canRecover) {
      return
    }

    if (autoRecover) {
      // 自动恢复
      const state = stateService.getCurrentState()
      if (state) {
        setCurrentState(state)
        onStateRecovered?.(state)
      }
    } else if (showRecoveryPrompt) {
      // 显示恢复提示
      const message = `检测到未完成的质检任务：${recoveryInfo.step} - ${recoveryInfo.barcode}`
      
      showInfo(
        message,
        '恢复会话'
      )
    }
  }, [hasCheckedRecovery, autoRecover, showRecoveryPrompt, onStateRecovered, showInfo])

  /**
   * 执行状态恢复
   */
  const handleRecover = useCallback(() => {
    setIsRecovering(true)
    
    try {
      const state = stateService.getCurrentState()
      if (state) {
        setCurrentState(state)
        onStateRecovered?.(state)
      }
    } catch (error) {
      console.error('Failed to recover state:', error)
    } finally {
      setIsRecovering(false)
    }
  }, [onStateRecovered])

  /**
   * 拒绝恢复
   */
  const handleDeclineRecovery = useCallback(() => {
    stateService.clearCurrentState()
    onRecoveryDeclined?.()
  }, [onRecoveryDeclined])

  /**
   * 保存当前状态
   */
  const saveState = useCallback((state: QCState) => {
    stateService.saveCurrentState(state)
    setCurrentState(state)
  }, [])

  /**
   * 清除当前状态
   */
  const clearState = useCallback(() => {
    stateService.clearCurrentState()
    setCurrentState(null)
  }, [])

  /**
   * 更新用户偏好
   */
  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    stateService.saveUserPreferences(preferences)
    setUserPreferences(prev => ({ ...prev, ...preferences }))
  }, [])

  /**
   * 获取恢复信息
   */
  const getRecoveryInfo = useCallback(() => {
    return stateService.getRecoveryInfo()
  }, [])

  /**
   * 获取状态历史
   */
  const getStateHistory = useCallback(() => {
    return stateService.getStateHistory()
  }, [])

  // 初始化时检查恢复
  useEffect(() => {
    checkRecovery()
  }, [checkRecovery])

  // 监听状态变化
  useEffect(() => {
    const unsubscribeState = stateService.onStateChange((state) => {
      setCurrentState(state)
    })

    const unsubscribePreferences = stateService.onPreferencesChange((preferences) => {
      setUserPreferences(preferences)
    })

    return () => {
      unsubscribeState()
      unsubscribePreferences()
    }
  }, [])

  // 页面可见性变化时检查状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const state = stateService.getCurrentState()
        setCurrentState(state)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return {
    // 状态
    currentState,
    userPreferences,
    isRecovering,
    hasRecoverableState: stateService.hasRecoverableState(),
    
    // 方法
    saveState,
    clearState,
    updatePreferences,
    handleRecover,
    handleDeclineRecovery,
    getRecoveryInfo,
    getStateHistory,
    
    // 工具方法
    blobToBase64: stateService.blobToBase64.bind(stateService),
    base64ToBlob: stateService.base64ToBlob.bind(stateService)
  }
}

/**
 * QC流程状态管理Hook
 */
export function useQCState() {
  const {
    currentState,
    saveState,
    clearState,
    userPreferences,
    updatePreferences
  } = useStateRecovery({
    autoRecover: false,
    showRecoveryPrompt: true
  })

  /**
   * 更新QC步骤
   */
  const updateStep = useCallback((
    step: QCState['currentStep'],
    data?: Partial<Omit<QCState, 'currentStep' | 'timestamp'>>
  ) => {
    const newState: QCState = {
      currentStep: step,
      timestamp: new Date().toISOString(),
      ...currentState,
      ...data
    }
    
    saveState(newState)
  }, [currentState, saveState])

  /**
   * 设置条形码
   */
  const setBarcode = useCallback((barcode: string, jobId?: string) => {
    updateStep('camera', { barcode, jobId })
  }, [updateStep])

  /**
   * 设置图片
   */
  const setImage = useCallback(async (imageBlob: Blob, imageUrl?: string) => {
    const imageBase64 = await stateService.blobToBase64(imageBlob)
    updateStep('uploading', { 
      imageBlob: imageBase64,
      imageUrl 
    })
  }, [updateStep])

  /**
   * 设置处理状态
   */
  const setProcessing = useCallback(() => {
    updateStep('processing')
  }, [updateStep])

  /**
   * 设置结果
   */
  const setResult = useCallback((result: QCState['result']) => {
    updateStep('result', { result })
  }, [updateStep])

  /**
   * 重置到初始状态
   */
  const resetToStart = useCallback(() => {
    clearState()
  }, [clearState])

  /**
   * 开始新的质检流程
   */
  const startNewQC = useCallback(() => {
    updateStep('barcode')
  }, [updateStep])

  return {
    // 当前状态
    currentState,
    currentStep: currentState?.currentStep || 'barcode',
    jobId: currentState?.jobId,
    barcode: currentState?.barcode,
    imageBlob: currentState?.imageBlob,
    imageUrl: currentState?.imageUrl,
    result: currentState?.result,
    
    // 用户偏好
    userPreferences,
    updatePreferences,
    
    // 状态更新方法
    updateStep,
    setBarcode,
    setImage,
    setProcessing,
    setResult,
    resetToStart,
    startNewQC,
    
    // 工具方法
    getImageBlob: () => currentState?.imageBlob ? stateService.base64ToBlob(currentState.imageBlob) : null
  }
}

/**
 * 状态恢复提示组件Hook
 */
export function useRecoveryPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [recoveryInfo, setRecoveryInfo] = useState<ReturnType<typeof stateService.getRecoveryInfo> | null>(null)

  useEffect(() => {
    const info = stateService.getRecoveryInfo()
    if (info.hasState && info.canRecover) {
      setRecoveryInfo(info)
      setShowPrompt(true)
    }
  }, [])

  const handleRecover = useCallback(() => {
    const state = stateService.getCurrentState()
    if (state) {
      // 这里应该触发应用状态的恢复
      window.location.reload() // 简单的实现，实际项目中应该更优雅
    }
    setShowPrompt(false)
  }, [])

  const handleDecline = useCallback(() => {
    stateService.clearCurrentState()
    setShowPrompt(false)
  }, [])

  return {
    showPrompt,
    recoveryInfo,
    handleRecover,
    handleDecline,
    hidePrompt: () => setShowPrompt(false)
  }
}