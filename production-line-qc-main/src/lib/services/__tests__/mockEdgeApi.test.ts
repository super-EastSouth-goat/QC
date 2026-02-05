import { MockEdgeApiService, mockConfigs } from '../mockEdgeApi'
import type { EdgeAPIRequest } from '../edgeApiService'

describe('MockEdgeApiService', () => {
  let mockService: MockEdgeApiService

  beforeEach(() => {
    mockService = new MockEdgeApiService(mockConfigs.testing)
  })

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const service = new MockEdgeApiService()
      const config = service.getConfig()
      
      expect(config.mode).toBe('realistic')
      expect(config.passRate).toBe(0.75)
      expect(config.errorRate).toBe(0.05)
    })

    it('should accept custom config', () => {
      const customConfig = {
        mode: 'demo' as const,
        passRate: 0.9,
        errorRate: 0.01
      }
      
      const service = new MockEdgeApiService(customConfig)
      const config = service.getConfig()
      
      expect(config.mode).toBe('demo')
      expect(config.passRate).toBe(0.9)
      expect(config.errorRate).toBe(0.01)
    })

    it('should update config correctly', () => {
      mockService.updateConfig({ passRate: 0.5 })
      const config = mockService.getConfig()
      
      expect(config.passRate).toBe(0.5)
      expect(config.mode).toBe('testing') // Should preserve other values
    })
  })

  describe('Testing Mode', () => {
    beforeEach(() => {
      mockService.updateConfig({ mode: 'testing', errorRate: 0 }) // Disable errors for predictable testing
    })

    it('should return PASS for PASS-prefixed barcodes', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'PASS-TEST-001',
        image_url: 'https://example.com/image.jpg'
      }

      const result = await mockService.analyzeImage(request)
      
      expect(result.status).toBe('success')
      expect(result.result).toBe('PASS')
      expect(result.confidence).toBe(0.95)
    })

    it('should return FAIL for FAIL-prefixed barcodes', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'FAIL-TEST-001',
        image_url: 'https://example.com/image.jpg'
      }

      const result = await mockService.analyzeImage(request)
      
      expect(result.status).toBe('success')
      expect(result.result).toBe('FAIL')
      expect(result.confidence).toBe(0.85)
    })

    it('should throw error for ERROR-prefixed barcodes', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'ERROR-TEST-001',
        image_url: 'https://example.com/image.jpg'
      }

      await expect(mockService.analyzeImage(request)).rejects.toThrow('测试错误场景')
    })
  })

  describe('Demo Mode', () => {
    beforeEach(() => {
      mockService.updateConfig({ mode: 'demo', errorRate: 0 }) // Disable errors for consistent testing
    })

    it('should return consistent results for same barcode', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'DEMO-CONSISTENT-001',
        image_url: 'https://example.com/image.jpg'
      }

      const result1 = await mockService.analyzeImage(request)
      const result2 = await mockService.analyzeImage(request)
      
      expect(result1.result).toBe(result2.result)
      expect(result1.confidence).toBe(result2.confidence)
      expect(result1.detail).toBe(result2.detail)
    })

    it('should include AI-themed messages', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'DEMO-AI-001',
        image_url: 'https://example.com/image.jpg'
      }

      const result = await mockService.analyzeImage(request)
      
      expect(result.detail).toMatch(/AI检测|智能分析|机器视觉|深度学习|自动检测/)
    })
  })

  describe('Realistic Mode', () => {
    beforeEach(() => {
      mockService.updateConfig({ mode: 'realistic', errorRate: 0 }) // Disable errors for consistent testing
    })

    it('should handle test products with high pass rate', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'test-product-123',
        image_url: 'https://example.com/image.jpg'
      }

      // Run multiple times to check pass rate tendency
      const results = await Promise.all(
        Array(20).fill(0).map(() => mockService.analyzeImage(request))
      )
      
      const passCount = results.filter(r => r.result === 'PASS').length
      const passRate = passCount / results.length
      
      // Should have higher pass rate for test products (around 90%)
      expect(passRate).toBeGreaterThan(0.7) // Allow some variance
    })

    it('should include product type in detail', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'batch-b001-456',
        image_url: 'https://example.com/image.jpg'
      }

      const result = await mockService.analyzeImage(request)
      
      expect(result.detail).toContain('批次产品')
    })
  })

  describe('Random Mode', () => {
    beforeEach(() => {
      mockService.updateConfig({ mode: 'random', passRate: 0.5, errorRate: 0 }) // Disable errors for consistent testing
    })

    it('should generate random results within expected range', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'random-test-001',
        image_url: 'https://example.com/image.jpg'
      }

      // Run multiple times to check randomness
      const results = await Promise.all(
        Array(50).fill(0).map(() => mockService.analyzeImage(request))
      )
      
      const passCount = results.filter(r => r.result === 'PASS').length
      const passRate = passCount / results.length
      
      // Should be around 50% with some variance
      expect(passRate).toBeGreaterThan(0.3)
      expect(passRate).toBeLessThan(0.7)
      
      // Check confidence range
      results.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.6)
        expect(result.confidence).toBeLessThanOrEqual(0.98)
      })
    })
  })

  describe('Error Simulation', () => {
    beforeEach(() => {
      mockService.updateConfig({ errorRate: 0.5 }) // High error rate for testing
    })

    it('should occasionally throw errors based on error rate', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'error-test-001',
        image_url: 'https://example.com/image.jpg'
      }

      // Run multiple times to check error rate
      const promises = Array(20).fill(0).map(() => 
        mockService.analyzeImage(request).catch(err => ({ error: err.message }))
      )
      
      const results = await Promise.all(promises)
      const errorCount = results.filter(r => 'error' in r).length
      
      // Should have some errors due to high error rate
      expect(errorCount).toBeGreaterThan(0)
    })
  })

  describe('Delay Simulation', () => {
    beforeEach(() => {
      mockService.updateConfig({ 
        delay: { min: 100, max: 200 }, // Short delays for testing
        errorRate: 0 // Disable errors for consistent testing
      })
    })

    it('should respect delay configuration', async () => {
      const request: EdgeAPIRequest = {
        job_id: 'test-job',
        barcode: 'delay-test-001',
        image_url: 'https://example.com/image.jpg'
      }

      const startTime = Date.now()
      await mockService.analyzeImage(request)
      const duration = Date.now() - startTime
      
      expect(duration).toBeGreaterThanOrEqual(100)
      expect(duration).toBeLessThan(300) // Allow some overhead
    })
  })

  describe('Preset Configurations', () => {
    it('should have valid development config', () => {
      const config = mockConfigs.development
      
      expect(config.mode).toBe('realistic')
      expect(config.passRate).toBeGreaterThan(0)
      expect(config.passRate).toBeLessThanOrEqual(1)
      expect(config.errorRate).toBeGreaterThanOrEqual(0)
      expect(config.errorRate).toBeLessThan(0.1)
    })

    it('should have valid demo config', () => {
      const config = mockConfigs.demo
      
      expect(config.mode).toBe('demo')
      expect(config.passRate).toBeGreaterThan(0)
      expect(config.passRate).toBeLessThanOrEqual(1)
    })

    it('should have valid testing config', () => {
      const config = mockConfigs.testing
      
      expect(config.mode).toBe('testing')
      expect(config.delay.min).toBeLessThan(config.delay.max)
    })

    it('should have valid production config', () => {
      const config = mockConfigs.production
      
      expect(config.mode).toBe('realistic')
      expect(config.delay.min).toBeGreaterThan(1000) // Should have realistic delays
    })
  })
})