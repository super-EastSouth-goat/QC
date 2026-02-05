'use client'

import { useState } from 'react'

export default function DebugEdgePage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (test: string, result: any) => {
    setTestResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }])
  }

  const testEdgeAPI = async () => {
    setLoading(true)
    setTestResults([])

    const baseUrl = process.env.NEXT_PUBLIC_EDGE_API_BASE_URL || 'http://221.226.60.30:8000'
    
    addResult('Test Configuration', {
      baseUrl,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      origin: window.location.origin
    })

    // Test 0: Basic network connectivity
    try {
      addResult('Network Connectivity Test', 'Testing basic connectivity...')
      const startTime = Date.now()
      
      // Try to connect to the base URL with a very simple request
      const response = await fetch(baseUrl, {
        method: 'HEAD',
        mode: 'no-cors', // This bypasses CORS for connectivity test
        cache: 'no-cache'
      })
      
      const endTime = Date.now()
      addResult('Network Connectivity Result', {
        responseTime: endTime - startTime,
        type: response.type,
        status: response.status || 'opaque'
      })
    } catch (error) {
      addResult('Network Connectivity Error', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      })
    }
    
    // Test 1: Health check
    try {
      addResult('Health Check URL', `${baseUrl}/health`)
      const healthResponse = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        mode: 'cors'
      })
      
      addResult('Health Response Status', {
        status: healthResponse.status,
        statusText: healthResponse.statusText,
        headers: Object.fromEntries(healthResponse.headers.entries())
      })

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        addResult('Health Response Data', healthData)
      } else {
        const errorText = await healthResponse.text()
        addResult('Health Error Text', errorText)
      }
    } catch (error) {
      addResult('Health Check Error', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      })
    }

    // Test 2: Test inference endpoint with OPTIONS (CORS preflight)
    try {
      addResult('CORS Preflight URL', `${baseUrl}/infer`)
      const corsResponse = await fetch(`${baseUrl}/infer`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      })
      
      addResult('CORS Preflight Response', {
        status: corsResponse.status,
        statusText: corsResponse.statusText,
        headers: Object.fromEntries(corsResponse.headers.entries())
      })
    } catch (error) {
      addResult('CORS Preflight Error', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      })
    }

    // Test 3: Test with a simple POST request (without file)
    try {
      const formData = new FormData()
      formData.append('barcode', 'TEST123')
      formData.append('request_id', 'debug_test_' + Date.now())

      addResult('Simple POST URL', `${baseUrl}/infer`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const postResponse = await fetch(`${baseUrl}/infer`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      addResult('Simple POST Response', {
        status: postResponse.status,
        statusText: postResponse.statusText,
        headers: Object.fromEntries(postResponse.headers.entries()),
        url: postResponse.url
      })

      const responseText = await postResponse.text()
      addResult('Simple POST Response Text', responseText)
    } catch (error) {
      addResult('Simple POST Error', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
    }

    // Test 4: Test direct connection to base URL
    try {
      addResult('Base URL Test', `${baseUrl}/`)
      const baseResponse = await fetch(`${baseUrl}/`, {
        method: 'GET',
        mode: 'cors'
      })
      
      addResult('Base URL Response', {
        status: baseResponse.status,
        statusText: baseResponse.statusText,
        headers: Object.fromEntries(baseResponse.headers.entries())
      })

      const baseText = await baseResponse.text()
      addResult('Base URL Response Text', baseText)
    } catch (error) {
      addResult('Base URL Error', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      })
    }

    // Test 5: Test with actual image file
    try {
      // Create a small test image (1x1 pixel PNG)
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'red'
        ctx.fillRect(0, 0, 1, 1)
      }
      
      const testBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png')
      })

      const formData = new FormData()
      formData.append('file', testBlob, 'test.png')
      formData.append('barcode', 'TEST_IMAGE_123')
      formData.append('request_id', 'debug_image_test_' + Date.now())

      addResult('Image POST URL', `${baseUrl}/infer`)
      addResult('Test Image Info', {
        size: testBlob.size,
        type: testBlob.type
      })
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const imageResponse = await fetch(`${baseUrl}/infer`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      addResult('Image POST Response', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        headers: Object.fromEntries(imageResponse.headers.entries()),
        url: imageResponse.url
      })

      const imageResponseText = await imageResponse.text()
      addResult('Image POST Response Text', imageResponseText)
    } catch (error) {
      addResult('Image POST Error', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">边缘 API 调试工具</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">配置信息</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Base URL:</strong> {process.env.NEXT_PUBLIC_EDGE_API_BASE_URL}</div>
            <div><strong>Current Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={testEdgeAPI}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '测试中...' : '开始测试'}
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">测试结果</h2>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-gray-900">{result.test}</h3>
                  <p className="text-xs text-gray-500 mb-2">{result.timestamp}</p>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}