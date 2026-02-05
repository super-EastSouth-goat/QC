/**
 * 边缘API模拟服务
 * 提供多种模拟策略，用于开发和测试
 */

import type { EdgeAPIRequest, EdgeAPIResponse } from './edgeApiService'

export interface MockConfig {
  mode: 'random' | 'realistic' | 'demo' | 'testing'
  delay: {
    min: number
    max: number
  }
  passRate: number // 0-1 之间，PASS的概率
  confidenceRange: {
    min: number
    max: number
  }
  errorRate: number // 0-1 之间，API错误的概率
}

export class MockEdgeApiService {
  private config: MockConfig

  constructor(config?: Partial<MockConfig>) {
    this.config = {
      mode: 'realistic',
      delay: { min: 800, max: 3000 },
      passRate: 0.75, // 75% 通过率
      confidenceRange: { min: 0.6, max: 0.98 },
      errorRate: 0.05, // 5% 错误率
      ...config
    }
  }

  /**
   * 模拟边缘API调用
   */
  async analyzeImage(request: EdgeAPIRequest): Promise<EdgeAPIResponse> {
    // 模拟网络延迟
    await this.simulateDelay()

    // 根据模式生成结果
    let result: EdgeAPIResponse
    switch (this.config.mode) {
      case 'random':
        result = this.generateRandomResult(request)
        break
      case 'realistic':
        result = this.generateRealisticResult(request)
        break
      case 'demo':
        result = this.generateDemoResult(request)
        break
      case 'testing':
        result = this.generateTestingResult(request)
        break
      default:
        result = this.generateRandomResult(request)
        break
    }

    // 模拟API错误（但不影响特定的测试场景）
    if (this.config.mode !== 'testing' || !request.barcode.startsWith('ERROR')) {
      if (Math.random() < this.config.errorRate) {
        throw new Error(this.generateRandomError())
      }
    }

    return result
  }

  /**
   * 模拟网络延迟
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * (this.config.delay.max - this.config.delay.min) + this.config.delay.min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * 生成随机结果
   */
  private generateRandomResult(request: EdgeAPIRequest): EdgeAPIResponse {
    const isPass = Math.random() < this.config.passRate
    const confidence = Math.random() * (this.config.confidenceRange.max - this.config.confidenceRange.min) + this.config.confidenceRange.min

    return {
      status: 'success',
      result: isPass ? 'PASS' : 'FAIL',
      confidence: Math.round(confidence * 100) / 100,
      detail: isPass ? '质检通过' : '发现质量问题'
    }
  }

  /**
   * 生成真实场景结果（基于条形码模式）
   */
  private generateRealisticResult(request: EdgeAPIRequest): EdgeAPIResponse {
    const barcode = request.barcode.toLowerCase()
    
    // 基于条形码特征模拟不同的结果
    let passRate = this.config.passRate
    let confidenceBase = 0.8
    let detail = ''

    // 模拟不同产品类型的质检结果
    if (barcode.includes('test') || barcode.includes('demo')) {
      // 测试产品，较高通过率
      passRate = 0.9
      confidenceBase = 0.85
      detail = '测试产品'
    } else if (barcode.includes('batch') || barcode.includes('b')) {
      // 批次产品，正常通过率
      passRate = 0.75
      confidenceBase = 0.8
      detail = '批次产品'
    } else if (barcode.includes('sample') || barcode.includes('s')) {
      // 样品，较低通过率（更严格）
      passRate = 0.6
      confidenceBase = 0.75
      detail = '样品检测'
    } else if (barcode.includes('urgent') || barcode.includes('u')) {
      // 紧急产品，快速检测但置信度稍低
      passRate = 0.8
      confidenceBase = 0.7
      detail = '紧急检测'
    }

    const isPass = Math.random() < passRate
    
    // 根据结果调整置信度
    let confidence: number
    if (isPass) {
      // 通过的产品置信度较高
      confidence = confidenceBase + Math.random() * (0.98 - confidenceBase)
    } else {
      // 不通过的产品置信度中等
      confidence = 0.6 + Math.random() * (confidenceBase - 0.6)
    }

    // 生成详细信息
    const detailMessages = {
      pass: [
        '外观检查通过',
        '尺寸符合标准',
        '表面质量良好',
        '颜色匹配正确',
        '无明显缺陷'
      ],
      fail: [
        '发现表面划痕',
        '尺寸超出公差',
        '颜色不匹配',
        '发现污渍',
        '边缘不平整',
        '材质异常'
      ]
    }

    const messages = isPass ? detailMessages.pass : detailMessages.fail
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    
    return {
      status: 'success',
      result: isPass ? 'PASS' : 'FAIL',
      confidence: Math.round(confidence * 100) / 100,
      detail: `${detail} - ${randomMessage}`
    }
  }

  /**
   * 生成演示结果（更有趣的展示效果）
   */
  private generateDemoResult(request: EdgeAPIRequest): EdgeAPIResponse {
    const barcode = request.barcode
    
    // 基于条形码生成一致的结果（同样的条形码总是得到相同结果）
    const hash = this.simpleHash(barcode)
    const isPass = (hash % 100) < (this.config.passRate * 100)
    
    // 基于哈希生成稳定的置信度
    const confidenceHash = (hash * 7) % 100
    const confidence = 0.6 + (confidenceHash / 100) * 0.38 // 0.6-0.98 范围
    
    const demoMessages = {
      pass: [
        '✅ AI检测：产品质量优秀',
        '✅ 智能分析：符合所有标准',
        '✅ 机器视觉：无缺陷检出',
        '✅ 深度学习：质量评级A+',
        '✅ 自动检测：完全合格'
      ],
      fail: [
        '❌ AI检测：发现质量问题',
        '❌ 智能分析：不符合标准',
        '❌ 机器视觉：检出缺陷',
        '❌ 深度学习：质量评级C',
        '❌ 自动检测：需要返工'
      ]
    }

    const messages = isPass ? demoMessages.pass : demoMessages.fail
    const messageIndex = hash % messages.length
    
    return {
      status: 'success',
      result: isPass ? 'PASS' : 'FAIL',
      confidence: Math.round(confidence * 100) / 100,
      detail: messages[messageIndex]
    }
  }

  /**
   * 生成测试结果（用于自动化测试）
   */
  private generateTestingResult(request: EdgeAPIRequest): EdgeAPIResponse {
    const barcode = request.barcode
    
    // 测试模式：基于条形码前缀确定结果
    if (barcode.startsWith('PASS')) {
      return {
        status: 'success',
        result: 'PASS',
        confidence: 0.95,
        detail: '测试通过'
      }
    } else if (barcode.startsWith('FAIL')) {
      return {
        status: 'success',
        result: 'FAIL',
        confidence: 0.85,
        detail: '测试失败'
      }
    } else if (barcode.startsWith('ERROR')) {
      // Always throw error for ERROR prefix in testing mode
      throw new Error('测试错误场景')
    }
    
    // 默认随机结果
    return this.generateRandomResult(request)
  }

  /**
   * 生成随机错误
   */
  private generateRandomError(): string {
    const errors = [
      'API服务暂时不可用',
      '图像分析超时',
      '模型加载失败',
      '网络连接中断',
      '服务器内部错误',
      '图像格式不支持',
      '分析队列已满'
    ]
    
    return errors[Math.floor(Math.random() * errors.length)]
  }

  /**
   * 简单哈希函数（用于生成一致的结果）
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash)
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MockConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取当前配置
   */
  getConfig(): MockConfig {
    return { ...this.config }
  }
}

// 预设配置
export const mockConfigs = {
  // 开发模式：快速响应，高通过率
  development: {
    mode: 'realistic' as const,
    delay: { min: 500, max: 1500 },
    passRate: 0.8,
    confidenceRange: { min: 0.7, max: 0.95 },
    errorRate: 0.02
  },
  
  // 演示模式：有趣的结果，中等延迟
  demo: {
    mode: 'demo' as const,
    delay: { min: 1000, max: 2500 },
    passRate: 0.7,
    confidenceRange: { min: 0.65, max: 0.98 },
    errorRate: 0.03
  },
  
  // 测试模式：快速响应，可预测结果
  testing: {
    mode: 'testing' as const,
    delay: { min: 100, max: 500 },
    passRate: 0.5,
    confidenceRange: { min: 0.8, max: 0.95 },
    errorRate: 0.1
  },
  
  // 生产模拟：真实延迟，真实通过率
  production: {
    mode: 'realistic' as const,
    delay: { min: 1500, max: 4000 },
    passRate: 0.75,
    confidenceRange: { min: 0.6, max: 0.98 },
    errorRate: 0.05
  }
}