import { EdgeApiService } from '../edgeApiService'
import { jobService } from '../jobService'

// Mock the jobService
jest.mock('../jobService', () => ({
  jobService: {
    updateJob: jest.fn(),
    logJobEvent: jest.fn(),
  }
}))

// Mock fetch
global.fetch = jest.fn()

describe('EdgeApiService', () => {
  let edgeApiService: EdgeApiService
  const mockJobService = jobService as jest.Mocked<typeof jobService>

  beforeEach(() => {
    jest.clearAllMocks()
    edgeApiService = new EdgeApiService()
  })

  describe('Mock Mode Detection', () => {
    it('should detect mock mode when EDGE_API_URL is not configured', () => {
      const mockConfig = edgeApiService.getMockConfig()
      
      // In test environment, EDGE_API_URL should be empty, so mock mode should be enabled
      expect(mockConfig).not.toBeNull()
      expect(mockConfig?.mode).toBeDefined()
    })

    it('should allow switching mock modes', () => {
      edgeApiService.switchMockMode('demo')
      const config = edgeApiService.getMockConfig()
      
      expect(config?.mode).toBe('demo')
    })

    it('should allow updating mock config', () => {
      edgeApiService.updateMockConfig({ passRate: 0.9 })
      const config = edgeApiService.getMockConfig()
      
      expect(config?.passRate).toBe(0.9)
    })

    it('should reset to preset configs', () => {
      edgeApiService.resetMockConfig('development')
      const config = edgeApiService.getMockConfig()
      
      expect(config?.mode).toBe('realistic')
      expect(config?.passRate).toBe(0.8)
    })
  })

  describe('Mock Analysis', () => {
    beforeEach(() => {
      // Set to testing mode for predictable results
      edgeApiService.switchMockMode('testing')
    })

    it('should perform mock analysis in mock mode', async () => {
      const request = {
        job_id: 'test-job-1',
        barcode: 'TEST-001',
        image_url: 'https://example.com/image.jpg'
      }

      const result = await edgeApiService.analyzeImage(request)
      
      expect(result.status).toBe('success')
      expect(['PASS', 'FAIL']).toContain(result.result)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.detail).toBeDefined()
    })

    it('should log API events during mock analysis', async () => {
      const request = {
        job_id: 'test-job-2',
        barcode: 'TEST-002',
        image_url: 'https://example.com/image.jpg'
      }

      await edgeApiService.analyzeImage(request)
      
      expect(mockJobService.logJobEvent).toHaveBeenCalledWith({
        job_id: 'test-job-2',
        event: 'api_call_started',
        detail: expect.objectContaining({
          barcode: 'TEST-002',
          image_url: 'https://example.com/image.jpg',
          mock_mode: true
        })
      })
    })

    it('should handle mock errors gracefully', async () => {
      // Use ERROR prefix to trigger mock error in testing mode
      const request = {
        job_id: 'test-job-error',
        barcode: 'ERROR-TEST-001',
        image_url: 'https://example.com/image.jpg'
      }

      // The edge API service catches mock errors and converts them to error responses
      const result = await edgeApiService.analyzeImage(request)
      
      expect(result.status).toBe('error')
      expect(result.result).toBe('FAIL')
      expect(result.detail).toContain('测试错误场景')
    })
  })

  describe('Complete QC Process', () => {
    it('should process quality check with job updates', async () => {
      const mockUpdatedJob = {
        id: 'test-job-3',
        user_id: 'user-1',
        barcode: 'TEST-003',
        station: null,
        status: 'processing' as const,
        result: null,
        confidence: null,
        detail: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      mockJobService.updateJob.mockResolvedValue(mockUpdatedJob)
      
      const result = await edgeApiService.processQualityCheck(
        'test-job-3',
        'PASS-TEST-003',
        'https://example.com/image.jpg'
      )
      
      // Should update job status to processing
      expect(mockJobService.updateJob).toHaveBeenCalledWith({
        id: 'test-job-3',
        status: 'processing'
      })
      
      // Should update job with final result
      expect(mockJobService.updateJob).toHaveBeenCalledWith({
        id: 'test-job-3',
        status: 'completed',
        result: result.result,
        confidence: result.confidence,
        detail: result.detail
      })
    })

    it('should handle process failures', async () => {
      mockJobService.updateJob.mockRejectedValueOnce(new Error('Database error'))
      
      await expect(
        edgeApiService.processQualityCheck(
          'test-job-fail',
          'TEST-FAIL',
          'https://example.com/image.jpg'
        )
      ).rejects.toThrow('Database error')
      
      // Should still try to update job status to failed
      expect(mockJobService.updateJob).toHaveBeenCalledWith({
        id: 'test-job-fail',
        status: 'failed',
        detail: 'Database error'
      })
    })
  })

  describe('Batch Processing', () => {
    it('should process multiple jobs', async () => {
      const requests = [
        { jobId: 'job-1', barcode: 'TEST-001', imageUrl: 'url1' },
        { jobId: 'job-2', barcode: 'TEST-002', imageUrl: 'url2' }
      ]
      
      const progressCallback = jest.fn()
      
      const results = await edgeApiService.processBatchQualityCheck(
        requests,
        progressCallback
      )
      
      expect(results).toHaveLength(2)
      expect(progressCallback).toHaveBeenCalledWith(1, 2)
      expect(progressCallback).toHaveBeenCalledWith(2, 2)
      
      results.forEach(result => {
        expect(result.jobId).toBeDefined()
        expect(result.result).toBeDefined()
      })
    })
  })

  describe('API Health Check', () => {
    it('should return healthy status in mock mode', async () => {
      const health = await edgeApiService.getApiHealth()
      
      expect(health.isHealthy).toBe(true)
      expect(health.responseTime).toBe(0)
      expect(health.error).toBeUndefined()
    })
  })

  describe('Test Scenarios Integration', () => {
    beforeEach(() => {
      // Set to testing mode for predictable results
      edgeApiService.switchMockMode('testing')
    })

    it('should handle PASS test scenarios', async () => {
      const request = {
        job_id: 'test-pass',
        barcode: 'PASS-STANDARD-001',
        image_url: 'https://example.com/image.jpg'
      }

      const result = await edgeApiService.analyzeImage(request)
      
      expect(result.status).toBe('success')
      expect(result.result).toBe('PASS')
    })

    it('should handle FAIL test scenarios', async () => {
      const request = {
        job_id: 'test-fail',
        barcode: 'FAIL-STANDARD-001',
        image_url: 'https://example.com/image.jpg'
      }

      const result = await edgeApiService.analyzeImage(request)
      
      expect(result.status).toBe('success')
      expect(result.result).toBe('FAIL')
    })

    it('should handle realistic scenarios based on barcode patterns', async () => {
      // Switch to realistic mode for this test and disable errors
      edgeApiService.updateMockConfig({ mode: 'realistic', errorRate: 0 })
      
      const testCases = [
        { barcode: 'test-product-123', expectedPattern: '测试产品' },
        { barcode: 'sample-s001-789', expectedPattern: '样品检测' },
        { barcode: 'batch-b001-456', expectedPattern: '批次产品' }
      ]

      for (const testCase of testCases) {
        const request = {
          job_id: `test-${testCase.barcode}`,
          barcode: testCase.barcode,
          image_url: 'https://example.com/image.jpg'
        }

        const result = await edgeApiService.analyzeImage(request)
        
        expect(result.status).toBe('success')
        expect(['PASS', 'FAIL']).toContain(result.result)
        expect(result.detail).toContain(testCase.expectedPattern)
      }
    }, 10000) // Increase timeout to 10 seconds)
  })
})