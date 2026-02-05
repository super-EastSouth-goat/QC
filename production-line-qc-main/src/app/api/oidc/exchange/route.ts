import { NextRequest, NextResponse } from 'next/server'

/**
 * OIDC Token Exchange API
 * 服务端处理 token 交换，保护 client_secret
 */

// 服务端 OIDC 配置（从环境变量读取）
const OIDC_SERVER_CONFIG = {
  issuer: process.env.ENTERPRISE_OIDC_ISSUER || 'https://panovation.i234.me:5001/webman/sso',
  clientId: process.env.ENTERPRISE_OIDC_CLIENT_ID || 'fd1297925826a23aed846c170a33fcbc',
  clientSecret: process.env.ENTERPRISE_OIDC_CLIENT_SECRET || 'REGRxUmocD8eIeGnULJtysKWPi3WW8LT',
}

/**
 * 获取 OIDC Discovery 配置
 */
async function getOIDCDiscovery() {
  try {
    const response = await fetch(`${OIDC_SERVER_CONFIG.issuer}/.well-known/openid-configuration`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch OIDC discovery')
    }
    
    return await response.json()
  } catch (error) {
    console.error('OIDC discovery error:', error)
    throw new Error('Failed to get OIDC configuration')
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 Exchange API called - ensuring no redirects')
  console.log('  - Request method:', request.method)
  console.log('  - Request URL:', request.url)
  console.log('  - Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    // 解析请求体
    const { code, redirectUri, codeVerifier } = await request.json()
    
    if (!code || !redirectUri || !codeVerifier) {
      console.log('❌ Missing parameters, returning 400 JSON')
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    console.log('🔍 OIDC Exchange Debug:')
    console.log('  - Code:', code.substring(0, 20) + '...')
    console.log('  - Redirect URI:', redirectUri)
    console.log('  - Code Verifier:', codeVerifier.substring(0, 20) + '...')
    
    // 获取 OIDC discovery 配置
    const discovery = await getOIDCDiscovery()
    
    console.log('📍 Token endpoint:', discovery.token_endpoint)
    
    // 尝试方法 1: Basic Auth + client_id in body
    console.log('🔄 Trying Method 1: Basic Auth + client_id in body')
    
    const basic = Buffer.from(`${OIDC_SERVER_CONFIG.clientId}:${OIDC_SERVER_CONFIG.clientSecret}`).toString('base64')
    
    let tokenResponse = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        client_id: OIDC_SERVER_CONFIG.clientId, // 添加 client_id 到 body
      }),
    })
    
    let tokenText = await tokenResponse.text()
    console.log('📊 Method 1 - IdP token status:', tokenResponse.status)
    console.log('📊 Method 1 - IdP token raw body:', tokenText)
    
    // 如果方法 1 失败，尝试方法 2: client_secret_post
    if (!tokenResponse.ok) {
      console.log('❌ Method 1 failed, trying Method 2: client_secret_post')
      
      tokenResponse = await fetch(discovery.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // 不使用 Authorization header
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
          client_id: OIDC_SERVER_CONFIG.clientId,
          client_secret: OIDC_SERVER_CONFIG.clientSecret, // client_secret 在 body 中
        }),
      })
      
      tokenText = await tokenResponse.text()
      console.log('📊 Method 2 - IdP token status:', tokenResponse.status)
      console.log('📊 Method 2 - IdP token raw body:', tokenText)
    } else {
      console.log('✅ Method 1 succeeded!')
    }
    
    if (!tokenResponse.ok) {
      console.error('❌ Both methods failed. Final status:', tokenResponse.status)
      const errorResponse = NextResponse.json(
        { 
          error: 'Token exchange failed', 
          details: tokenText,
          status: tokenResponse.status,
          endpoint: discovery.token_endpoint,
          methods_tried: ['basic_auth_with_client_id', 'client_secret_post']
        },
        { status: tokenResponse.status }
      )
      
      console.log('❌ Returning error JSON response (no redirect)')
      return errorResponse
    }
    
    // 解析 tokens
    let tokens
    try {
      tokens = JSON.parse(tokenText)
      console.log('✅ Token exchange successful, got access_token:', tokens.access_token ? 'present' : 'missing')
    } catch (parseError) {
      console.error('❌ Failed to parse token response as JSON:', parseError)
      return NextResponse.json(
        { 
          error: 'Invalid token response format', 
          details: tokenText,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 500 }
      )
    }
    
    console.log('📍 Userinfo endpoint:', discovery.userinfo_endpoint)
    
    // 使用 discovery 返回的 userinfo_endpoint 获取用户信息
    const userInfoResponse = await fetch(discovery.userinfo_endpoint, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })
    
    // 🔍 详细日志 - UserInfo 响应
    const userInfoText = await userInfoResponse.text()
    console.log('📊 UserInfo status:', userInfoResponse.status)
    console.log('📊 UserInfo raw body:', userInfoText)
    
    if (!userInfoResponse.ok) {
      console.error('❌ UserInfo fetch failed with status:', userInfoResponse.status)
      const errorResponse = NextResponse.json(
        { 
          error: 'Failed to fetch user info', 
          details: userInfoText,
          status: userInfoResponse.status,
          endpoint: discovery.userinfo_endpoint
        },
        { status: userInfoResponse.status }
      )
      
      console.log('❌ Returning userinfo error JSON response (no redirect)')
      return errorResponse
    }
    
    // 解析 userInfo
    let userInfo
    try {
      userInfo = JSON.parse(userInfoText)
      console.log('✅ UserInfo fetch successful, user:', userInfo.email || userInfo.sub || 'unknown')
    } catch (parseError) {
      console.error('❌ Failed to parse userinfo response as JSON:', parseError)
      return NextResponse.json(
        { 
          error: 'Invalid userinfo response format', 
          details: userInfoText,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 500 }
      )
    }
    
    console.log('🎉 OIDC login successful for user:', userInfo.email || userInfo.sub)
    
    // 返回 tokens 和 userInfo
    const successResponse = NextResponse.json({
      tokens,
      userInfo,
    })
    
    console.log('✅ Returning 200 JSON response (no redirect)')
    return successResponse
  } catch (error) {
    console.error('💥 OIDC exchange error:', error)
    const errorResponse = NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
    
    console.log('💥 Returning 500 JSON response (no redirect)')
    return errorResponse
  }
}
