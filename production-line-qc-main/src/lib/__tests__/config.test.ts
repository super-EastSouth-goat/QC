import { config, isDevelopment, isProduction, isMockMode } from '../config'

describe('Config', () => {
  it('should have required configuration values', () => {
    expect(config.supabase.url).toBeDefined()
    expect(config.supabase.anonKey).toBeDefined()
    expect(config.edgeApi.timeout).toBe(30000)
    expect(config.edgeApi.maxRetries).toBe(2)
    expect(config.polling.interval).toBe(2000)
    expect(config.polling.maxDuration).toBe(30000)
    expect(config.storage.bucketName).toBe('qc-images')
  })

  it('should correctly determine environment', () => {
    expect(typeof isDevelopment).toBe('boolean')
    expect(typeof isProduction).toBe('boolean')
    expect(typeof isMockMode).toBe('boolean')
  })

  it('should enable mock mode when Edge API URL is not configured', () => {
    // Since EDGE_API_URL is empty in test environment, mock mode should be enabled
    expect(isMockMode).toBe(true)
  })
})