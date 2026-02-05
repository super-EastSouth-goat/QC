export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  edgeApi: {
    url: process.env.EDGE_API_URL || '',
    timeout: 30000, // 30 seconds
    maxRetries: 2,
  },
  polling: {
    interval: 2000, // 2 seconds
    maxDuration: 30000, // 30 seconds
  },
  storage: {
    bucketName: 'qc-images',
  },
} as const

export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'

// Mock mode when Edge API URL is not configured
export const isMockMode = !config.edgeApi.url