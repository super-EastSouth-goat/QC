import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple test endpoint to verify API routing works correctly
 */
export async function GET(request: NextRequest) {
  console.log('🧪 Test API called')
  console.log('  - Request method:', request.method)
  console.log('  - Request URL:', request.url)
  
  return NextResponse.json({
    message: 'Test API working correctly',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
  })
}

export async function POST(request: NextRequest) {
  console.log('🧪 Test API POST called')
  console.log('  - Request method:', request.method)
  console.log('  - Request URL:', request.url)
  
  try {
    const body = await request.json()
    console.log('  - Request body:', body)
    
    return NextResponse.json({
      message: 'Test API POST working correctly',
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      receivedBody: body,
    })
  } catch (error) {
    return NextResponse.json({
      message: 'Test API POST - failed to parse body',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 400 })
  }
}