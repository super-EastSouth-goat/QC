import { config, isMockMode } from '../config'
import { jobService } from './jobService'
import { MockEdgeApiService, mockConfigs } from './mockEdgeApi'

export interface EdgeAPIRequest {
  job_id: string
  barcode: string
  image_url: string
}

export interface EdgeAPIResponse {
  status: 'success' | 'error'
  result: 'PASS' | 'FAIL'
  detail?: string
  confidence?: number
}

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

export class EdgeApiService {
  private readonly apiUrl: string
  private readonly timeout: number
  private readonly defaultRetryOptions: RetryOptions
  private mockService: MockEdgeApiService

  constructor() {
    this.apiUrl = config.edgeApi.url
    this.timeout = config.edgeApi.timeout
    this.defaultRetryOptions = {
      maxRetries: config.edgeApi.maxRetries,
      baseDelay: 1000, // 1秒
      maxDelay: 5000   // 5秒
    }
    
    // 初始化模拟服务
    const isDevelopment = process.env.NODE_ENV === 'development'
    const mockConfig = isDevelopment ? mockConfigs.development : mockConfigs.demo
    this.mockService = new MockEdgeApiService(mockConfig)
  }

  /**
   * 调用边缘API进行质检分析
   * 需求: 7.1, 7.3 - Edge API调用和请求格式
   */
  async analyzeImage(request: EdgeAPIRequest): Promise<EdgeAPIResponse> {
    // 记录API调用开始
    await this.logApiEvent(request.job_id, 'api_call_started', {
      barcode: request.barcode,
      image_url: request.image_url,
      mock_mode: isMockMode
    })

    try {
      // 模拟模式
      if (isMockMode) {
        return await this.mockAnalysis(request)
      }

      // 实际API调用
      return await this.callEdgeApiWithRetry(request)
    } catch (error) {
      await this.logApiEvent(request.job_id, 'api_call_failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * 带重试机制的API调用
   * 需求: 4.3, 4.4 - 重试机制和错误处理
   */
  private async callEdgeApiWithRetry(
    request: EdgeAPIRequest,
    retryOptions: RetryOptions = this.defaultRetryOptions
  ): Promise<EdgeAPIResponse> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        // 记录重试尝试
        if (attempt > 0) {
          await this.logApiEvent(request.job_id, 'api_retry_attempt', {
            attempt,
            max_retries: retryOptions.maxRetries
          })
        }

        const response = await this.callEdgeApi(request)
        
        // 成功调用，记录结果
        await this.logApiEvent(request.job_id, 'api_call_success', {
          attempt,
          result: response.result,
          confidence: response.confidence
        })

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // 记录失败尝试
        await this.logApiEvent(request.job_id, 'api_call_attempt_failed', {
          attempt,
          error: lastError.message
        })

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retryOptions.maxRetries) {
          const delay = Math.min(
            retryOptions.baseDelay * Math.pow(2, attempt),
            retryOptions.maxDelay
          )
          await this.sleep(delay)
        }
      }
    }

    // 所有重试都失败了
    throw new Error(`API调用失败，已重试${retryOptions.maxRetries}次: ${lastError?.message}`)
  }

  /**
   * 实际的API调用
   */
  private async callEdgeApi(request: EdgeAPIRequest): Promise<EdgeAPIResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.apiUrl}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // 验证响应格式
      if (!this.isValidApiResponse(data)) {
        throw new Error('API响应格式无效')
      }

      return data
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`API调用超时 (${this.timeout}ms)`)
      }
      
      throw error
    }
  }

  /**
   * 模拟分析（当EDGE_API_URL为空时使用）
   * 需求: 7.2 - 模拟模式支持
   */
  private async mockAnalysis(request: EdgeAPIRequest): Promise<EdgeAPIResponse> {
    // 使用智能模拟服务
    await this.logApiEvent(request.job_id, 'mock_analysis_started', {
      barcode: request.barcode,
      mode: this.mockService.getConfig().mode
    })

    try {
      const result = await this.mockService.analyzeImage(request)
      
      await this.logApiEvent(request.job_id, 'mock_analysis_completed', {
        barcode: request.barcode,
        result: result.result,
        confidence: result.confidence
      })

      return result
    } catch (error) {
      await this.logApiEvent(request.job_id, 'mock_analysis_error', {
        barcode: request.barcode,
        error: error instanceof Error ? error.message : String(error)
      })
      
      // 模拟API错误
      return {
        status: 'error',
        result: 'FAIL',
        detail: error instanceof Error ? error.message : '模拟API错误'
      }
    }
  }

  /**
   * 验证API响应格式
   * 需求: 7.4 - API响应解析
   */
  private isValidApiResponse(data: any): data is EdgeAPIResponse {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.status === 'string' &&
      ['success', 'error'].includes(data.status) &&
      (data.status === 'error' || (
        typeof data.result === 'string' &&
        ['PASS', 'FAIL'].includes(data.result)
      ))
    )
  }

  /**
   * 处理完整的质检流程
   * 包括API调用和任务状态更新
   */
  async processQualityCheck(
    jobId: string,
    barcode: string,
    imageUrl: string
  ): Promise<EdgeAPIResponse> {
    try {
      // 更新任务状态为处理中
      await jobService.updateJob({
        id: jobId,
        status: 'processing'
      })

      // 调用API分析
      const result = await this.analyzeImage({
        job_id: jobId,
        barcode,
        image_url: imageUrl
      })

      // 根据结果更新任务状态
      if (result.status === 'success') {
        await jobService.updateJob({
          id: jobId,
          status: 'completed',
          result: result.result,
          confidence: result.confidence,
          detail: result.detail
        })
      } else {
        await jobService.updateJob({
          id: jobId,
          status: 'failed',
          detail: result.detail || 'API分析失败'
        })
      }

      return result
    } catch (error) {
      // 更新任务状态为失败
      await jobService.updateJob({
        id: jobId,
        status: 'failed',
        detail: error instanceof Error ? error.message : '未知错误'
      })

      throw error
    }
  }

  /**
   * 批量处理质检任务
   */
  async processBatchQualityCheck(
    requests: Array<{
      jobId: string
      barcode: string
      imageUrl: string
    }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ jobId: string; result: EdgeAPIResponse | Error }>> {
    const results: Array<{ jobId: string; result: EdgeAPIResponse | Error }> = []
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      
      try {
        const result = await this.processQualityCheck(
          request.jobId,
          request.barcode,
          request.imageUrl
        )
        results.push({ jobId: request.jobId, result })
      } catch (error) {
        results.push({ 
          jobId: request.jobId, 
          result: error instanceof Error ? error : new Error(String(error))
        })
      }

      // 通知进度
      if (onProgress) {
        onProgress(i + 1, requests.length)
      }
    }

    return results
  }

  /**
   * 获取API健康状态
   */
  async getApiHealth(): Promise<{
    isHealthy: boolean
    responseTime?: number
    error?: string
  }> {
    if (isMockMode) {
      return { isHealthy: true, responseTime: 0 }
    }

    const startTime = Date.now()
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      return {
        isHealthy: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`
      }
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 记录API事件
   */
  private async logApiEvent(
    jobId: string,
    event: string,
    detail: any
  ): Promise<void> {
    try {
      // 使用jobService记录事件
      await jobService.logJobEvent({
        job_id: jobId,
        event,
        detail
      })
    } catch (error) {
      // 事件记录失败不应该影响主要功能
      console.error('记录API事件失败:', error)
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 切换模拟模式（仅在模拟模式下有效）
   */
  switchMockMode(mode: 'random' | 'realistic' | 'demo' | 'testing'): void {
    if (isMockMode) {
      this.mockService.updateConfig({ mode })
    }
  }

  /**
   * 更新模拟配置（仅在模拟模式下有效）
   */
  updateMockConfig(config: Partial<import('./mockEdgeApi').MockConfig>): void {
    if (isMockMode) {
      this.mockService.updateConfig(config)
    }
  }

  /**
   * 获取当前模拟配置
   */
  getMockConfig(): import('./mockEdgeApi').MockConfig | null {
    return isMockMode ? this.mockService.getConfig() : null
  }

  /**
   * 重置为预设配置
   */
  resetMockConfig(preset: 'development' | 'demo' | 'testing' | 'production'): void {
    if (isMockMode) {
      this.mockService.updateConfig(mockConfigs[preset])
    }
  }
}

// 导出单例实例
export const edgeApiService = new EdgeApiService()