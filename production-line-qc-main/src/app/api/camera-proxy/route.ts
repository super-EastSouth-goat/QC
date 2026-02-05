/**
 * Camera Proxy API
 * 边缘机相机代理 - 转发视频流和设备信息
 * 
 * 修改日期: 2026-02-04
 * 修改目的: 解决浏览器直接访问边缘机时的混合内容和 CORS 问题
 */

import { NextRequest, NextResponse } from 'next/server'

const EDGE_API_BASE_URL = process.env.NEXT_PUBLIC_EDGE_API_BASE_URL || 'http://221.226.60.30:8000'

/**
 * GET /api/camera-proxy
 * 
 * 支持的 endpoint 参数:
 * - devices: 获取相机设备列表
 * - video_feed: 获取视频流 (MJPEG)
 * - status: 获取相机状态
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || 'devices'
  
  // 根据不同的 endpoint 处理请求
  switch (endpoint) {
    case 'video_feed':
      return handleVideoFeed()
    case 'devices':
      return handleDevices()
    case 'status':
      return handleStatus()
    default:
      return NextResponse.json(
        { error: 'Unknown endpoint', valid_endpoints: ['video_feed', 'devices', 'status'] },
        { status: 400 }
      )
  }
}

/**
 * 处理视频流请求
 * 转发边缘机的 MJPEG 视频流
 */
async function handleVideoFeed() {
  try {
    console.log(`🎥 Proxying video feed from: ${EDGE_API_BASE_URL}/api/camera/video_feed`)
    
    const response = await fetch(`${EDGE_API_BASE_URL}/api/camera/video_feed`, {
      method: 'GET',
      // 不设置超时，因为视频流是持续的
    })

    if (!response.ok) {
      console.error(`❌ Video feed error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: 'Failed to connect to camera', status: response.status },
        { status: response.status }
      )
    }

    // 检查响应是否为流
    if (!response.body) {
      return NextResponse.json(
        { error: 'No video stream available' },
        { status: 500 }
      )
    }

    // 创建转换流来转发数据
    const { readable, writable } = new TransformStream()
    
    // 异步转发数据
    const writer = writable.getWriter()
    const reader = response.body.getReader()
    
    // 在后台持续转发数据
    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('📹 Video stream ended')
            await writer.close()
            break
          }
          await writer.write(value)
        }
      } catch (error) {
        console.error('❌ Video stream error:', error)
        try {
          await writer.abort(error instanceof Error ? error : new Error(String(error)))
        } catch {
          // 忽略关闭错误
        }
      }
    })()

    // 返回流式响应
    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('❌ Video feed proxy error:', error)
    return NextResponse.json(
      { error: 'Video feed proxy failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * 处理设备列表请求
 */
async function handleDevices() {
  try {
    console.log(`📷 Fetching camera devices from: ${EDGE_API_BASE_URL}/api/camera/devices`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

    const response = await fetch(`${EDGE_API_BASE_URL}/api/camera/devices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`❌ Devices fetch error: ${response.status}`)
      return NextResponse.json(
        { error: 'Failed to fetch camera devices', status: response.status },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`✅ Camera devices:`, data)
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('❌ Devices proxy error:', error)
    
    // 如果是超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', details: 'Camera service not responding' },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: 'Devices proxy failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * 处理相机状态请求
 */
async function handleStatus() {
  try {
    console.log(`📊 Fetching camera status from: ${EDGE_API_BASE_URL}/api/status`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${EDGE_API_BASE_URL}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch camera status', status: response.status },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`✅ Camera status:`, data)
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('❌ Status proxy error:', error)
    return NextResponse.json(
      { error: 'Status proxy failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS 请求处理 (CORS 预检)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
