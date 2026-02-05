/**
 * 状态持久化和恢复服务
 * 需求: 8.5 - 页面刷新后状态恢复
 */

export interface QCState {
  currentStep: 'barcode' | 'camera' | 'uploading' | 'processing' | 'result'
  jobId?: string
  barcode?: string
  imageBlob?: string // Base64编码的图片数据
  imageUrl?: string
  result?: {
    status: 'PASS' | 'FAIL'
    confidence?: number
    detail?: string
    timestamp: string
  }
  timestamp: string
}

export interface UserPreferences {
  cameraDeviceId?: string
  autoFocus: boolean
  showDebugInfo: boolean
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
}

export interface SessionData {
  qcState?: QCState | null
  userPreferences: UserPreferences
  lastActivity: string
  sessionId: string
}

const QC_STATE_KEY = 'qc_current_state'
const USER_PREFERENCES_KEY = 'qc_user_preferences'
const SESSION_DATA_KEY = 'qc_session_data'
const STATE_HISTORY_KEY = 'qc_state_history'

/**
 * 状态管理服务
 */
export class StateService {
  private sessionId: string
  private stateChangeListeners: Array<(state: QCState | null) => void> = []
  private preferencesChangeListeners: Array<(preferences: UserPreferences) => void> = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeSession()
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 初始化会话
   */
  private initializeSession(): void {
    try {
      const sessionData: SessionData = {
        qcState: this.getCurrentState(),
        userPreferences: this.getUserPreferences(),
        lastActivity: new Date().toISOString(),
        sessionId: this.sessionId
      }

      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.error('Failed to initialize session:', error)
    }
  }

  /**
   * 保存当前QC状态
   */
  saveCurrentState(state: QCState): void {
    try {
      const stateWithTimestamp = {
        ...state,
        timestamp: new Date().toISOString()
      }

      localStorage.setItem(QC_STATE_KEY, JSON.stringify(stateWithTimestamp))
      
      // 保存到历史记录
      this.saveStateToHistory(stateWithTimestamp)
      
      // 更新会话数据
      this.updateSessionActivity()
      
      // 通知监听器
      this.notifyStateChange(stateWithTimestamp)
    } catch (error) {
      console.error('Failed to save current state:', error)
    }
  }

  /**
   * 获取当前QC状态
   */
  getCurrentState(): QCState | null {
    try {
      const stateJson = localStorage.getItem(QC_STATE_KEY)
      if (!stateJson) return null

      const state = JSON.parse(stateJson) as QCState
      
      // 检查状态是否过期（超过1小时）
      const stateTime = new Date(state.timestamp).getTime()
      const now = Date.now()
      const oneHour = 60 * 60 * 1000

      if (now - stateTime > oneHour) {
        this.clearCurrentState()
        return null
      }

      return state
    } catch (error) {
      console.error('Failed to get current state:', error)
      return null
    }
  }

  /**
   * 清除当前状态
   */
  clearCurrentState(): void {
    try {
      localStorage.removeItem(QC_STATE_KEY)
      this.updateSessionActivity()
      this.notifyStateChange(null)
    } catch (error) {
      console.error('Failed to clear current state:', error)
    }
  }

  /**
   * 保存用户偏好设置
   */
  saveUserPreferences(preferences: Partial<UserPreferences>): void {
    try {
      const currentPreferences = this.getUserPreferences()
      const updatedPreferences = { ...currentPreferences, ...preferences }
      
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(updatedPreferences))
      this.updateSessionActivity()
      this.notifyPreferencesChange(updatedPreferences)
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  }

  /**
   * 获取用户偏好设置
   */
  getUserPreferences(): UserPreferences {
    try {
      const preferencesJson = localStorage.getItem(USER_PREFERENCES_KEY)
      if (!preferencesJson) {
        return this.getDefaultPreferences()
      }

      const preferences = JSON.parse(preferencesJson) as UserPreferences
      return { ...this.getDefaultPreferences(), ...preferences }
    } catch (error) {
      console.error('Failed to get user preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  /**
   * 获取默认偏好设置
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      autoFocus: true,
      showDebugInfo: false,
      theme: 'auto',
      language: 'zh-CN'
    }
  }

  /**
   * 保存状态到历史记录
   */
  private saveStateToHistory(state: QCState): void {
    try {
      const historyJson = localStorage.getItem(STATE_HISTORY_KEY)
      const history: QCState[] = historyJson ? JSON.parse(historyJson) : []
      
      history.push(state)
      
      // 只保留最近20个状态
      if (history.length > 20) {
        history.splice(0, history.length - 20)
      }
      
      localStorage.setItem(STATE_HISTORY_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save state to history:', error)
    }
  }

  /**
   * 获取状态历史记录
   */
  getStateHistory(): QCState[] {
    try {
      const historyJson = localStorage.getItem(STATE_HISTORY_KEY)
      return historyJson ? JSON.parse(historyJson) : []
    } catch (error) {
      console.error('Failed to get state history:', error)
      return []
    }
  }

  /**
   * 清除状态历史记录
   */
  clearStateHistory(): void {
    try {
      localStorage.removeItem(STATE_HISTORY_KEY)
    } catch (error) {
      console.error('Failed to clear state history:', error)
    }
  }

  /**
   * 更新会话活动时间
   */
  private updateSessionActivity(): void {
    try {
      const sessionDataJson = localStorage.getItem(SESSION_DATA_KEY)
      if (sessionDataJson) {
        const sessionData = JSON.parse(sessionDataJson) as SessionData
        sessionData.lastActivity = new Date().toISOString()
        sessionData.qcState = this.getCurrentState()
        sessionData.userPreferences = this.getUserPreferences()
        
        localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData))
      }
    } catch (error) {
      console.error('Failed to update session activity:', error)
    }
  }

  /**
   * 获取会话数据
   */
  getSessionData(): SessionData | null {
    try {
      const sessionDataJson = localStorage.getItem(SESSION_DATA_KEY)
      return sessionDataJson ? JSON.parse(sessionDataJson) : null
    } catch (error) {
      console.error('Failed to get session data:', error)
      return null
    }
  }

  /**
   * 检查是否有可恢复的状态
   */
  hasRecoverableState(): boolean {
    const state = this.getCurrentState()
    return state !== null && state.currentStep !== 'barcode'
  }

  /**
   * 获取恢复提示信息
   */
  getRecoveryInfo(): {
    hasState: boolean
    step?: string
    barcode?: string
    timestamp?: string
    canRecover: boolean
  } {
    const state = this.getCurrentState()
    
    if (!state) {
      return { hasState: false, canRecover: false }
    }

    const stepNames: Record<QCState['currentStep'], string> = {
      barcode: '扫码输入',
      camera: '相机拍照',
      uploading: '上传中',
      processing: '处理中',
      result: '结果显示'
    }

    return {
      hasState: true,
      step: stepNames[state.currentStep],
      barcode: state.barcode,
      timestamp: state.timestamp,
      canRecover: state.currentStep !== 'barcode'
    }
  }

  /**
   * 恢复到指定状态
   */
  recoverToState(state: QCState): void {
    this.saveCurrentState(state)
  }

  /**
   * 将图片Blob转换为Base64字符串（用于持久化）
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * 将Base64字符串转换为Blob
   */
  base64ToBlob(base64: string): Blob {
    const [header, data] = base64.split(',')
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const byteCharacters = atob(data)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  /**
   * 监听状态变化
   */
  onStateChange(listener: (state: QCState | null) => void): () => void {
    this.stateChangeListeners.push(listener)
    
    // 返回取消监听的函数
    return () => {
      const index = this.stateChangeListeners.indexOf(listener)
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1)
      }
    }
  }

  /**
   * 监听偏好设置变化
   */
  onPreferencesChange(listener: (preferences: UserPreferences) => void): () => void {
    this.preferencesChangeListeners.push(listener)
    
    return () => {
      const index = this.preferencesChangeListeners.indexOf(listener)
      if (index > -1) {
        this.preferencesChangeListeners.splice(index, 1)
      }
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(state: QCState | null): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(state)
      } catch (error) {
        console.error('Error in state change listener:', error)
      }
    })
  }

  /**
   * 通知偏好设置变化
   */
  private notifyPreferencesChange(preferences: UserPreferences): void {
    this.preferencesChangeListeners.forEach(listener => {
      try {
        listener(preferences)
      } catch (error) {
        console.error('Error in preferences change listener:', error)
      }
    })
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    try {
      // 清理过期状态
      const state = this.getCurrentState()
      if (!state) {
        this.clearCurrentState()
      }

      // 清理过期会话数据
      const sessionData = this.getSessionData()
      if (sessionData) {
        const lastActivity = new Date(sessionData.lastActivity).getTime()
        const now = Date.now()
        const oneDay = 24 * 60 * 60 * 1000

        if (now - lastActivity > oneDay) {
          localStorage.removeItem(SESSION_DATA_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired data:', error)
    }
  }

  /**
   * 导出状态数据（用于调试）
   */
  exportStateData(): {
    currentState: QCState | null
    preferences: UserPreferences
    history: QCState[]
    session: SessionData | null
  } {
    return {
      currentState: this.getCurrentState(),
      preferences: this.getUserPreferences(),
      history: this.getStateHistory(),
      session: this.getSessionData()
    }
  }

  /**
   * 重置所有数据
   */
  resetAll(): void {
    try {
      localStorage.removeItem(QC_STATE_KEY)
      localStorage.removeItem(USER_PREFERENCES_KEY)
      localStorage.removeItem(SESSION_DATA_KEY)
      localStorage.removeItem(STATE_HISTORY_KEY)
      
      this.initializeSession()
      this.notifyStateChange(null)
      this.notifyPreferencesChange(this.getDefaultPreferences())
    } catch (error) {
      console.error('Failed to reset all data:', error)
    }
  }
}

// 导出单例实例
export const stateService = new StateService()

// 页面卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stateService.cleanup()
  })
}