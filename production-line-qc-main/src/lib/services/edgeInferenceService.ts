/**
 * Edge Inference Service
 * Handles communication with edge machine inference API
 */

import { createClient } from '@/lib/supabase/client'

export interface EdgeInferenceRequest {
  file: Blob
  barcode: string
  request_id: string
}

/**
 * 网络相机设备信息
 * 2026-02-04: 新增，用于支持边缘机海康威视相机
 */
export interface NetworkCameraDevice {
  id: string
  label: string
  url: string
}

export interface EdgeDetection {
  id: string
  cls: string
  conf: number
  xyxy: [number, number, number, number] // [x1, y1, x2, y2]
}

export interface EdgeInferenceResponse {
  request_id: string
  barcode: string
  time_ms: number
  img_shape: [number, number] // [width, height] array format
  detections: EdgeDetection[]
  suggested_decision: 'PASS' | 'FAIL' | 'UNKNOWN' | 'OK' | 'NG' // 2026-02-04: 添加 'NG' 支持后端实际返回值
  model_version?: string
}

export interface InspectionRecord {
  id?: string
  barcode: string
  edge_request_id: string
  edge_url: string
  model_version?: string
  suggested_decision: 'PASS' | 'FAIL' | 'UNKNOWN' // Keep normalized format for database
  raw_detections: EdgeDetection[]
  inference_time_ms: number
  img_shape: [number, number] // [width, height] array format to match API
  image_url?: string
  image_size?: number
  user_id?: string
  profile_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  created_at?: string
  updated_at?: string
}

export class EdgeInferenceService {
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly useProxy: boolean

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_EDGE_API_BASE_URL || 'http://221.226.60.30:8000'
    this.timeout = 30000 // 30 seconds timeout
    
    // Always use proxy in browser environment to avoid CORS issues
    this.useProxy = typeof window !== 'undefined'
    
    console.log('🔧 EdgeInferenceService config:', {
      baseUrl: this.baseUrl,
      useProxy: this.useProxy,
      isClient: typeof window !== 'undefined'
    })
  }

  /**
   * Check if edge API is available
   */
  async checkHealth(): Promise<{
    isHealthy: boolean
    responseTime?: number
    error?: string
    modelLoaded?: boolean
  }> {
    const startTime = Date.now()
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout for health check

      const url = this.useProxy 
        ? '/api/edge-proxy?endpoint=health'
        : `${this.baseUrl}/health`

      console.log('🏥 Health check URL:', url, this.useProxy ? '(via proxy)' : '(direct)')

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      if (!response.ok) {
        return {
          isHealthy: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      
      return {
        isHealthy: true,
        responseTime,
        modelLoaded: data.model_loaded || false
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
   * Send image for inference
   */
  async inferImage(request: EdgeInferenceRequest): Promise<EdgeInferenceResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      // Create FormData for multipart/form-data
      const formData = new FormData()
      formData.append('file', request.file)
      formData.append('barcode', request.barcode)
      formData.append('request_id', request.request_id)

      const url = this.useProxy 
        ? '/api/edge-proxy'
        : `${this.baseUrl}/infer`

      console.log('🔍 Sending inference request:', {
        baseUrl: this.baseUrl,
        fullUrl: url,
        useProxy: this.useProxy,
        barcode: request.barcode,
        requestId: request.request_id,
        fileSize: request.file.size,
        fileType: request.file.type
      })

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Add headers for debugging
        headers: {
          // Don't set Content-Type for FormData, let browser set it with boundary
        }
      })

      clearTimeout(timeoutId)

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Edge API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          url: response.url
        })
        throw new Error(`Edge API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      console.log('Inference response received:', data)

      // Validate response format
      if (!this.isValidInferenceResponse(data)) {
        console.error('❌ Invalid response format. Expected fields:', {
          request_id: 'string',
          barcode: 'string',
          time_ms: 'number',
          img_shape: '[width, height] array',
          detections: 'array',
          suggested_decision: 'PASS|FAIL|UNKNOWN|OK'
        })
        console.error('❌ Received:', data)
        throw new Error('Invalid inference response format')
      }

      // Convert old format to new format if needed
      if ('status' in data && 'result' in data) {
        // Old format - convert to new format
        console.log('🔄 Converting old format to new format')
        return {
          request_id: request.request_id,
          barcode: request.barcode,
          time_ms: 0, // Not available in old format
          img_shape: [0, 0], // Not available in old format
          detections: [], // Not available in old format
          suggested_decision: (data as any).result === 'PASS' ? 'PASS' : (data as any).result === 'FAIL' ? 'FAIL' : 'UNKNOWN',
          model_version: undefined
        }
      }

      // Normalize the response - convert "OK" to "PASS" and "NG" to "FAIL"
      // 2026-02-04: 添加 NG → FAIL 映射，修复后端返回 NG 时前端无法正确处理的问题
      let normalizedDecision = data.suggested_decision
      if (data.suggested_decision === 'OK') {
        normalizedDecision = 'PASS'
      } else if (data.suggested_decision === 'NG') {
        normalizedDecision = 'FAIL'
      }
      
      const normalizedResponse = {
        ...data,
        suggested_decision: normalizedDecision
      }

      return normalizedResponse
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`推理请求超时 (${this.timeout}ms)`)
      }
      
      console.error('❌ Inference request failed:', error)
      throw error
    }
  }

  /**
   * Process complete inference workflow: upload image, infer, save record
   */
  async processInference(
    file: Blob,
    barcode: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<InspectionRecord> {
    const requestId = this.generateRequestId()
    
    try {
      onProgress?.('准备推理请求...', 10)

      // Step 1: Upload image to Supabase Storage (for record keeping)
      let imageUrl: string | undefined
      let imageSize = file.size
      
      try {
        onProgress?.('上传图片到存储...', 20)
        imageUrl = await this.uploadImage(file, requestId)
        console.log('✅ Image uploaded successfully:', imageUrl)
      } catch (uploadError) {
        console.warn('⚠️ Image upload failed, continuing without storage:', uploadError)
        // Continue without image storage - inference can still work
        onProgress?.('图片上传失败，继续推理...', 30)
      }

      onProgress?.('发送推理请求...', 50)

      // Step 2: Send inference request
      const inferenceResult = await this.inferImage({
        file,
        barcode,
        request_id: requestId
      })

      onProgress?.('保存推理记录...', 80)

      // Step 3: Save inspection record to database
      const record = await this.saveInspectionRecord({
        barcode,
        edge_request_id: requestId,
        edge_url: this.baseUrl,
        model_version: inferenceResult.model_version,
        suggested_decision: inferenceResult.suggested_decision === 'OK' ? 'PASS' : inferenceResult.suggested_decision, // Normalize here
        raw_detections: inferenceResult.detections,
        inference_time_ms: inferenceResult.time_ms,
        img_shape: inferenceResult.img_shape,
        image_url: imageUrl,
        image_size: imageSize,
        status: 'completed'
      })

      onProgress?.('完成', 100)

      console.log('🎉 Inference workflow completed:', {
        recordId: record.id,
        decision: record.suggested_decision,
        detections: record.raw_detections.length
      })

      return record
    } catch (error) {
      console.error('💥 Inference workflow failed:', error)
      
      // Try to save error record
      try {
        const errorRecord = await this.saveInspectionRecord({
          barcode,
          edge_request_id: requestId,
          edge_url: this.baseUrl,
          suggested_decision: 'UNKNOWN',
          raw_detections: [],
          inference_time_ms: 0,
          img_shape: [0, 0], // Array format
          image_size: file.size,
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error)
        })
        
        return errorRecord
      } catch (saveError) {
        console.error('Failed to save error record:', saveError)
        throw error // Re-throw original error
      }
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  private async uploadImage(file: Blob, requestId: string): Promise<string> {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated for image upload')
    }
    
    // Generate unique filename with user folder structure for RLS
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${user.id}/inference-${requestId}-${timestamp}.jpg`
    
    console.log('📤 Uploading image:', {
      bucket: 'qc-images',
      filename,
      fileSize: file.size,
      userId: user.id
    })
    
    const { data, error } = await supabase.storage
      .from('qc-images')
      .upload(filename, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      })

    if (error) {
      console.error('❌ Storage upload error:', error)
      throw new Error(`Image upload failed: ${error.message}`)
    }

    console.log('✅ Storage upload success:', data)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('qc-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  /**
   * Save inspection record to database
   */
  private async saveInspectionRecord(record: Omit<InspectionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<InspectionRecord> {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get user profile
    let profileId: string | undefined
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      
      profileId = profile?.id
    }

    const recordData = {
      ...record,
      user_id: user?.id,
      profile_id: profileId
    }

    const { data, error } = await supabase
      .from('inspections')
      .insert(recordData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save inspection record: ${error.message}`)
    }

    return data
  }

  /**
   * Get inspection records with pagination
   */
  async getInspections(options: {
    limit?: number
    offset?: number
    barcode?: string
    status?: string
    userId?: string
  } = {}): Promise<{
    data: InspectionRecord[]
    count: number
  }> {
    const supabase = createClient()
    
    let query = supabase
      .from('inspections')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (options.barcode) {
      query = query.ilike('barcode', `%${options.barcode}%`)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch inspections: ${error.message}`)
    }

    return {
      data: data || [],
      count: count || 0
    }
  }

  /**
   * Get single inspection by ID
   */
  async getInspection(id: string): Promise<InspectionRecord | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch inspection: ${error.message}`)
    }

    return data
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `req_${timestamp}_${random}`
  }

  /**
   * 获取边缘机网络相机设备列表
   * 2026-02-04: 新增方法，支持前端显示网络相机
   */
  async getNetworkCameraDevices(): Promise<NetworkCameraDevice[]> {
    try {
      console.log('📷 Fetching network camera devices...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/camera-proxy?endpoint=devices', {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error('❌ Failed to fetch camera devices:', response.status)
        return []
      }

      const data = await response.json()
      console.log('✅ Network camera devices:', data)
      
      // 转换为标准格式
      if (Array.isArray(data)) {
        return data.map((device: any) => ({
          id: device.id || 'unknown',
          label: device.label || '网络相机',
          url: '/api/camera-proxy?endpoint=video_feed' // 使用代理 URL
        }))
      }
      
      return []
    } catch (error) {
      console.error('❌ Error fetching network camera devices:', error)
      return []
    }
  }

  /**
   * 获取网络相机视频流 URL (通过代理)
   * 2026-02-04: 新增方法
   */
  getVideoFeedUrl(): string {
    return '/api/camera-proxy?endpoint=video_feed'
  }

  /**
   * 检查网络相机是否可用
   * 2026-02-04: 新增方法
   */
  async checkNetworkCameraAvailable(): Promise<boolean> {
    try {
      const devices = await this.getNetworkCameraDevices()
      return devices.length > 0
    } catch {
      return false
    }
  }

  /**
   * Validate inference response format
   */
  private isValidInferenceResponse(data: any): data is EdgeInferenceResponse {
    console.log('🔍 Validating response format:', data)
    
    // Handle both old and new API response formats
    const isOldFormat = (
      typeof data === 'object' &&
      data !== null &&
      typeof data.status === 'string' &&
      ['success', 'error'].includes(data.status) &&
      (data.status === 'error' || (
        typeof data.result === 'string' &&
        ['PASS', 'FAIL'].includes(data.result)
      ))
    )
    
    // Current API format validation
    const isCurrentFormat = (
      typeof data === 'object' &&
      data !== null &&
      typeof data.request_id === 'string' &&
      typeof data.barcode === 'string' &&
      typeof data.time_ms === 'number' &&
      Array.isArray(data.img_shape) && // img_shape is array [width, height]
      data.img_shape.length === 2 &&
      typeof data.img_shape[0] === 'number' &&
      typeof data.img_shape[1] === 'number' &&
      Array.isArray(data.detections) &&
      typeof data.suggested_decision === 'string' &&
      ['PASS', 'FAIL', 'UNKNOWN', 'OK', 'NG'].includes(data.suggested_decision) // 2026-02-04: 添加 'NG' 支持
    )
    
    console.log('🔍 Format validation:', { isOldFormat, isCurrentFormat })
    
    return isCurrentFormat || isOldFormat
  }
}

// Export singleton instance
export const edgeInferenceService = new EdgeInferenceService()