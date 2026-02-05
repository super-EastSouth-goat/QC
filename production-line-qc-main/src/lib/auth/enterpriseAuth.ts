/**
 * Enterprise Authentication Service
 * Provides a unified interface for different enterprise auth providers
 * Currently supports: custom_oidc, keycloak (future)
 */

import { initiateOIDCLogin, handleOIDCCallback } from './oidcService'

export type EnterpriseAuthProvider = 'custom_oidc' | 'keycloak'

export interface EnterpriseAuthConfig {
  provider: EnterpriseAuthProvider
  customOidc?: {
    issuer: string
    clientId: string
    scopes: string
  }
  keycloak?: {
    url: string
    realm: string
    clientId: string
  }
}

/**
 * Get enterprise auth configuration from environment variables
 */
function getEnterpriseAuthConfig(): EnterpriseAuthConfig {
  const provider = (process.env.NEXT_PUBLIC_ENTERPRISE_AUTH_PROVIDER || 'custom_oidc') as EnterpriseAuthProvider
  
  return {
    provider,
    customOidc: {
      issuer: 'https://panovation.i234.me:5001/webman/sso',
      clientId: 'fd1297925826a23aed846c170a33fcbc',
      scopes: 'openid profile email',
    },
    keycloak: {
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || '',
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || '',
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || '',
    }
  }
}

/**
 * Start enterprise login flow
 * Redirects user to appropriate enterprise auth provider
 */
export async function startEnterpriseLogin(): Promise<void> {
  const config = getEnterpriseAuthConfig()
  
  console.log('Starting enterprise login with provider:', config.provider)
  
  switch (config.provider) {
    case 'custom_oidc':
      // Use existing OIDC service
      await initiateOIDCLogin()
      break
      
    case 'keycloak':
      // TODO: Implement Keycloak login when available
      throw new Error('Keycloak provider not yet implemented')
      
    default:
      throw new Error(`Unknown enterprise auth provider: ${config.provider}`)
  }
}

/**
 * Handle enterprise auth callback
 * Processes the callback from enterprise auth provider
 */
export async function handleEnterpriseCallback(params: URLSearchParams): Promise<{
  tokens: any
  userInfo: any
}> {
  const config = getEnterpriseAuthConfig()
  
  console.log('Handling enterprise callback with provider:', config.provider)
  
  switch (config.provider) {
    case 'custom_oidc': {
      const code = params.get('code')
      const state = params.get('state')
      
      if (!code || !state) {
        throw new Error('Missing required callback parameters')
      }
      
      // Use existing OIDC callback handler
      return await handleOIDCCallback(code, state)
    }
    
    case 'keycloak':
      // TODO: Implement Keycloak callback when available
      throw new Error('Keycloak provider not yet implemented')
      
    default:
      throw new Error(`Unknown enterprise auth provider: ${config.provider}`)
  }
}

/**
 * Get enterprise auth provider display name
 */
export function getEnterpriseAuthProviderName(): string {
  const config = getEnterpriseAuthConfig()
  
  switch (config.provider) {
    case 'custom_oidc':
      return '企业 OIDC 登录'
    case 'keycloak':
      return 'Keycloak 登录'
    default:
      return '企业登录'
  }
}

/**
 * Check if enterprise auth is available
 */
export function isEnterpriseAuthAvailable(): boolean {
  const config = getEnterpriseAuthConfig()
  
  switch (config.provider) {
    case 'custom_oidc':
      return !!(config.customOidc?.issuer && config.customOidc?.clientId)
    case 'keycloak':
      return !!(config.keycloak?.url && config.keycloak?.realm && config.keycloak?.clientId)
    default:
      return false
  }
}