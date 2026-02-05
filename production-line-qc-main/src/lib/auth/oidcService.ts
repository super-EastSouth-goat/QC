/**
 * 自定义 OIDC 登录服务
 * 前端负责：生成 PKCE、跳转授权页面
 * 后端负责：token 交换（保护 client_secret）
 */

// OIDC 配置（前端安全配置，不含 secret）
const OIDC_CONFIG = {
  issuer: 'https://panovation.i234.me:5001/webman/sso', // 公网 issuer
  clientId: 'fd1297925826a23aed846c170a33fcbc',
  scopes: 'openid profile email',
  get redirectUri() {
    if (typeof window === 'undefined') return ''
    // 使用企业回调页面（统一入口）
    return `${window.location.origin}/auth/enterprise-callback`
  }
}

/**
 * 获取 OIDC Discovery 配置
 */
async function getOIDCDiscovery() {
  try {
    const response = await fetch(`${OIDC_CONFIG.issuer}/.well-known/openid-configuration`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch OIDC discovery')
    }
    
    return await response.json()
  } catch (error) {
    console.error('OIDC discovery error:', error)
    throw new Error('无法获取 OIDC 配置，请检查网络连接')
  }
}

/**
 * 生成随机字符串用于 state 和 nonce
 */
function generateRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length]
  }
  
  return result
}

/**
 * 纯 JS 实现的 SHA-256 (用于非安全上下文的 fallback)
 */
function sha256Fallback(str: string): string {
  // 简单的 SHA-256 实现（用于 HTTP 环境）
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount))
  }
  
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]
  
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]
  
  // 转换为字节数组
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  
  const bitLen = bytes.length * 8
  bytes.push(0x80)
  
  while ((bytes.length % 64) !== 56) {
    bytes.push(0x00)
  }
  
  for (let i = 7; i >= 0; i--) {
    bytes.push((bitLen >>> (i * 8)) & 0xff)
  }
  
  // 处理每个 512 位块
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const W: number[] = []
    
    for (let i = 0; i < 16; i++) {
      W[i] = (bytes[chunk + i * 4] << 24) |
             (bytes[chunk + i * 4 + 1] << 16) |
             (bytes[chunk + i * 4 + 2] << 8) |
             bytes[chunk + i * 4 + 3]
    }
    
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3)
      const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10)
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0
    }
    
    let [a, b, c, d, e, f, g, h] = H
    
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    
    H = [
      (H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0,
      (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0
    ]
  }
  
  // 转换为十六进制字符串
  return H.map(h => h.toString(16).padStart(8, '0')).join('')
}

/**
 * 生成 PKCE code challenge (支持 HTTP 环境)
 */
async function pkceChallenge(verifier: string): Promise<string> {
  try {
    // 优先使用 WebCrypto API (HTTPS/localhost)
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder()
      const data = encoder.encode(verifier)
      const hash = await crypto.subtle.digest('SHA-256', data)
      
      // Base64url encode
      return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    }
  } catch (error) {
    console.warn('WebCrypto not available, using fallback SHA-256')
  }
  
  // Fallback: 使用纯 JS 实现 (HTTP 环境)
  const hash = sha256Fallback(verifier)
  
  // 将十六进制转换为字节数组
  const bytes: number[] = []
  for (let i = 0; i < hash.length; i += 2) {
    bytes.push(parseInt(hash.substring(i, i + 2), 16))
  }
  
  // Base64url encode
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 生成 PKCE code verifier 和 challenge
 */
async function generatePKCE() {
  const verifier = generateRandomString(128)
  const challenge = await pkceChallenge(verifier)
  
  return { verifier, challenge }
}

/**
 * 启动 OIDC 登录流程
 * 使用 discovery 获取正确的 authorization_endpoint
 */
export async function initiateOIDCLogin() {
  try {
    // 获取 OIDC discovery 配置
    const discovery = await getOIDCDiscovery()
    
    // 生成 state 和 nonce 用于安全验证
    const state = generateRandomString()
    const nonce = generateRandomString()
    
    // 生成 PKCE
    const { verifier, challenge } = await generatePKCE()
    
    // 保存到 sessionStorage，回调时验证
    sessionStorage.setItem('oidc_state', state)
    sessionStorage.setItem('oidc_nonce', nonce)
    sessionStorage.setItem('oidc_code_verifier', verifier)
    
    // 使用 discovery 返回的 authorization_endpoint（不要拼路径）
    const authUrl = new URL(discovery.authorization_endpoint)
    authUrl.searchParams.set('client_id', OIDC_CONFIG.clientId)
    authUrl.searchParams.set('redirect_uri', OIDC_CONFIG.redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', OIDC_CONFIG.scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('nonce', nonce)
    authUrl.searchParams.set('code_challenge', challenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    
    // 🔍 调试日志 - 确认生成的 URL
    console.log('🔍 OIDC Login Debug:')
    console.log('  - Issuer:', OIDC_CONFIG.issuer)
    console.log('  - Client ID:', OIDC_CONFIG.clientId)
    console.log('  - Redirect URI:', OIDC_CONFIG.redirectUri)
    console.log('  - Authorization Endpoint:', discovery.authorization_endpoint)
    console.log('  - Full Authorize URL:', authUrl.toString())
    
    // 在页面上也显示（方便调试）
    if (typeof window !== 'undefined') {
      const debugInfo = `
🔍 OIDC 调试信息:
- Redirect URI: ${OIDC_CONFIG.redirectUri}
- Auth Endpoint: ${discovery.authorization_endpoint}
- Full URL: ${authUrl.toString()}
      `.trim()
      
      // 临时显示在页面上
      const debugDiv = document.createElement('div')
      debugDiv.style.cssText = `
        position: fixed; top: 10px; right: 10px; 
        background: #000; color: #0f0; padding: 10px; 
        font-family: monospace; font-size: 12px; 
        white-space: pre-wrap; z-index: 9999; 
        max-width: 400px; border-radius: 4px;
      `
      debugDiv.textContent = debugInfo
      document.body.appendChild(debugDiv)
      
      // 5秒后自动移除
      setTimeout(() => {
        if (debugDiv.parentNode) {
          debugDiv.parentNode.removeChild(debugDiv)
        }
      }, 5000)
    }
    
    console.log('Redirecting to authorization endpoint:', discovery.authorization_endpoint)
    
    // 重定向到 OIDC 提供商
    window.location.href = authUrl.toString()
  } catch (error) {
    console.error('Failed to initiate OIDC login:', error)
    throw new Error('无法启动企业登录，请重试')
  }
}

/**
 * 处理 OIDC 回调
 * 调用服务端 API 交换授权码（保护 client_secret）
 */
export async function handleOIDCCallback(code: string, state: string) {
  try {
    // 验证 state
    const savedState = sessionStorage.getItem('oidc_state')
    if (!savedState || savedState !== state) {
      throw new Error('Invalid state parameter')
    }
    
    // 获取 code verifier
    const codeVerifier = sessionStorage.getItem('oidc_code_verifier')
    if (!codeVerifier) {
      throw new Error('Missing code verifier')
    }
    
    // 调用服务端 API 交换 token（client_secret 只在服务端）
    const response = await fetch('/api/oidc/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirectUri: OIDC_CONFIG.redirectUri,
        codeVerifier,
      }),
      // 防止自动跟随重定向
      redirect: 'manual',
    })
    
    console.log('📊 Exchange API response:', {
      status: response.status,
      statusText: response.statusText,
      type: response.type,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    })
    
    // 检查是否是重定向响应
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      const location = response.headers.get('location')
      console.error('❌ Exchange API returned redirect:', response.status, 'Location:', location)
      throw new Error(`Token exchange API returned unexpected redirect to: ${location}`)
    }
    
    if (!response.ok) {
      let errorData
      let responseText = ''
      
      try {
        responseText = await response.text()
        console.log('📊 Exchange API error response body:', responseText)
        
        // 尝试解析为 JSON
        errorData = JSON.parse(responseText)
      } catch (parseError) {
        console.warn('Failed to parse error response as JSON:', parseError)
        errorData = { 
          error: 'HTTP Error', 
          details: responseText || `${response.status} ${response.statusText}`,
          status: response.status,
          statusText: response.statusText
        }
      }
      
      console.error('❌ Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData,
        responseText
      })
      
      const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
      const errorDetails = errorData.details ? ` (${errorData.details})` : ''
      throw new Error(`${errorMessage}${errorDetails}`)
    }
    
    const { tokens, userInfo } = await response.json()
    
    // 清理 session storage
    sessionStorage.removeItem('oidc_state')
    sessionStorage.removeItem('oidc_nonce')
    sessionStorage.removeItem('oidc_code_verifier')
    
    return {
      tokens,
      userInfo,
    }
  } catch (error) {
    console.error('OIDC callback error:', error)
    throw error
  }
}

/**
 * 使用 OIDC token 登录到 Supabase
 */
export async function signInWithOIDCToken(idToken: string, userInfo: any) {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  
  try {
    // 使用 OIDC 用户信息创建或更新 Supabase 用户
    // 这里我们使用 email/password 方式，但使用 OIDC 的用户信息
    
    // 首先尝试用 email 登录（如果用户已存在）
    const { data: existingUser, error: signInError } = await supabase.auth.signInWithPassword({
      email: userInfo.email,
      password: idToken.substring(0, 72), // 使用 token 的一部分作为密码
    })
    
    if (!signInError && existingUser) {
      return { user: existingUser.user, session: existingUser.session }
    }
    
    // 如果用户不存在，创建新用户
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email: userInfo.email,
      password: idToken.substring(0, 72),
      options: {
        data: {
          name: userInfo.name || userInfo.preferred_username,
          oidc_sub: userInfo.sub,
          oidc_provider: 'enterprise',
        },
      },
    })
    
    if (signUpError) {
      throw signUpError
    }
    
    return { user: newUser.user, session: newUser.session }
  } catch (error) {
    console.error('Failed to sign in with OIDC token:', error)
    throw error
  }
}
