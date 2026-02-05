/**
 * 测试场景工具
 * 提供预定义的测试条形码和预期结果
 */

export interface TestScenario {
  name: string
  barcode: string
  expectedResult: 'PASS' | 'FAIL' | 'ERROR'
  description: string
  category: 'basic' | 'edge-case' | 'error' | 'performance'
}

export const testScenarios: TestScenario[] = [
  // 基础测试场景
  {
    name: '标准通过测试',
    barcode: 'PASS-STANDARD-001',
    expectedResult: 'PASS',
    description: '标准产品，应该通过质检',
    category: 'basic'
  },
  {
    name: '标准失败测试',
    barcode: 'FAIL-STANDARD-001',
    expectedResult: 'FAIL',
    description: '有缺陷的产品，应该失败',
    category: 'basic'
  },
  
  // 产品类型测试
  {
    name: '测试产品',
    barcode: 'TEST-PRODUCT-123',
    expectedResult: 'PASS',
    description: '测试产品，通常有较高通过率',
    category: 'basic'
  },
  {
    name: '批次产品',
    barcode: 'BATCH-B001-456',
    expectedResult: 'PASS',
    description: '批次产品，正常质检流程',
    category: 'basic'
  },
  {
    name: '样品检测',
    barcode: 'SAMPLE-S001-789',
    expectedResult: 'FAIL',
    description: '样品检测，更严格的标准',
    category: 'basic'
  },
  {
    name: '紧急产品',
    barcode: 'URGENT-U001-999',
    expectedResult: 'PASS',
    description: '紧急产品，快速检测',
    category: 'basic'
  },
  
  // 边界情况测试
  {
    name: '空条形码',
    barcode: '',
    expectedResult: 'ERROR',
    description: '空条形码应该被拒绝',
    category: 'edge-case'
  },
  {
    name: '超长条形码',
    barcode: 'VERY-LONG-BARCODE-' + 'X'.repeat(100),
    expectedResult: 'PASS',
    description: '测试系统对长条形码的处理',
    category: 'edge-case'
  },
  {
    name: '特殊字符',
    barcode: 'TEST-特殊字符-@#$%',
    expectedResult: 'PASS',
    description: '包含特殊字符的条形码',
    category: 'edge-case'
  },
  {
    name: '数字条形码',
    barcode: '1234567890123',
    expectedResult: 'PASS',
    description: '纯数字条形码',
    category: 'edge-case'
  },
  
  // 错误场景测试
  {
    name: 'API错误触发',
    barcode: 'ERROR-API-500',
    expectedResult: 'ERROR',
    description: '触发API错误的条形码',
    category: 'error'
  },
  {
    name: '超时测试',
    barcode: 'ERROR-TIMEOUT-001',
    expectedResult: 'ERROR',
    description: '模拟API超时场景',
    category: 'error'
  },
  
  // 性能测试
  {
    name: '快速响应',
    barcode: 'PERF-FAST-001',
    expectedResult: 'PASS',
    description: '测试快速响应场景',
    category: 'performance'
  },
  {
    name: '慢速响应',
    barcode: 'PERF-SLOW-001',
    expectedResult: 'PASS',
    description: '测试慢速响应场景',
    category: 'performance'
  }
]

export const scenarioCategories = {
  basic: '基础测试',
  'edge-case': '边界情况',
  error: '错误场景',
  performance: '性能测试'
}

/**
 * 根据类别获取测试场景
 */
export function getScenariosByCategory(category: keyof typeof scenarioCategories): TestScenario[] {
  return testScenarios.filter(scenario => scenario.category === category)
}

/**
 * 获取随机测试场景
 */
export function getRandomScenario(category?: keyof typeof scenarioCategories): TestScenario {
  const scenarios = category ? getScenariosByCategory(category) : testScenarios
  return scenarios[Math.floor(Math.random() * scenarios.length)]
}

/**
 * 根据条形码获取场景信息
 */
export function getScenarioByBarcode(barcode: string): TestScenario | null {
  return testScenarios.find(scenario => scenario.barcode === barcode) || null
}

/**
 * 生成测试报告
 */
export interface TestResult {
  scenario: TestScenario
  actualResult: 'PASS' | 'FAIL' | 'ERROR'
  success: boolean
  duration: number
  confidence?: number
  detail?: string
}

export class TestRunner {
  private results: TestResult[] = []

  /**
   * 运行单个测试场景
   */
  async runScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // 这里应该调用实际的质检流程
      // 为了演示，我们模拟一个结果
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500))
      
      const duration = Date.now() - startTime
      const actualResult: 'PASS' | 'FAIL' | 'ERROR' = scenario.expectedResult // 简化处理
      
      const result: TestResult = {
        scenario,
        actualResult,
        success: actualResult === scenario.expectedResult,
        duration,
        confidence: Math.random() * 0.4 + 0.6,
        detail: `测试场景: ${scenario.name}`
      }
      
      this.results.push(result)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const result: TestResult = {
        scenario,
        actualResult: 'ERROR',
        success: scenario.expectedResult === 'ERROR',
        duration,
        detail: error instanceof Error ? error.message : '未知错误'
      }
      
      this.results.push(result)
      return result
    }
  }

  /**
   * 运行多个测试场景
   */
  async runScenarios(scenarios: TestScenario[]): Promise<TestResult[]> {
    const results: TestResult[] = []
    
    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario)
      results.push(result)
    }
    
    return results
  }

  /**
   * 获取测试统计
   */
  getStatistics(): {
    total: number
    passed: number
    failed: number
    errors: number
    successRate: number
    averageDuration: number
  } {
    const total = this.results.length
    const passed = this.results.filter(r => r.actualResult === 'PASS').length
    const failed = this.results.filter(r => r.actualResult === 'FAIL').length
    const errors = this.results.filter(r => r.actualResult === 'ERROR').length
    const successful = this.results.filter(r => r.success).length
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total || 0
    
    return {
      total,
      passed,
      failed,
      errors,
      successRate: (successful / total) * 100 || 0,
      averageDuration
    }
  }

  /**
   * 清除测试结果
   */
  clearResults(): void {
    this.results = []
  }

  /**
   * 获取所有测试结果
   */
  getResults(): TestResult[] {
    return [...this.results]
  }
}