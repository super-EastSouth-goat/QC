/**
 * Edge API Proxy
 * 边缘 API 代理 - 解决 CORS 问题
 */

import { NextRequest, NextResponse } from 'next/server'

const EDGE_API_BASE_URL = process.env.NEXT_PUBLIC_EDGE_API_BASE_URL || 'http://221.226.60.30:8000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || 'health'
  
  try {
    console.log(`🔄 Proxying GET request to: ${EDGE_API_BASE_URL}/${endpoint}`)
    
    const response = await fetch(`${EDGE_API_BASE_URL}/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.text()
    
    console.log(`✅ Proxy response: ${response.status} ${response.statusText}`)
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log(`🔄 Proxying POST request to: ${EDGE_API_BASE_URL}/infer`)
    
    // Get the form data from the request
    const formData = await request.formData()
    
    console.log('📤 Form data fields:', Array.from(formData.keys()))
    
    const response = await fetch(`${EDGE_API_BASE_URL}/infer`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let fetch handle it for FormData
    })

    const responseText = await response.text()
    
    console.log(`✅ Proxy response: ${response.status} ${response.statusText}`)
    console.log(`📥 Response data:`, responseText.substring(0, 200) + '...')
    
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    })
  } catch (error) {
    console.error('❌ Proxy POST error:', error)
    return NextResponse.json(
      { error: 'Proxy POST request failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}