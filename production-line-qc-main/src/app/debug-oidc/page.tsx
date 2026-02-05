'use client'

import { useState } from 'react'

interface TestResults {
  callbackTest?: any
  discoveryTest?: any
  currentConfig?: any
  exchangeTest?: any
  testApiTest?: any
}

/**
 * OIDC 调试页面
 * 用于验证配置和回调页面
 */
export default function DebugOIDCPage() {
  const [testResults, setTestResults] = useState<TestResults>({})

  const testCallback = async () => {
    try {
      const response = await fetch('/auth/enterprise-callback', {
        method: 'GET',
      })
      
      setTestResults((prev: TestResults) => ({
        ...prev,
        callbackTest: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        }
      }))
    } catch (error) {
      setTestResults((prev: TestResults) => ({
        ...prev,
        callbackTest: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }

  const testDiscovery = async () => {
    try {
      const issuer = 'https://panovation.i234.me:5001/webman/sso'
      const response = await fetch(`${issuer}/.well-known/openid-configuration`)
      const data = await response.json()
      
      setTestResults((prev: TestResults) => ({
        ...prev,
        discoveryTest: {
          status: response.status,
          ok: response.ok,
          data: data,
        }
      }))
    } catch (error) {
      setTestResults((prev: TestResults) => ({
        ...prev,
        discoveryTest: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }

  const testExchangeApi = async () => {
    try {
      const response = await fetch('/api/oidc/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'test_code',
          redirectUri: 'http://test.com/callback',
          codeVerifier: 'test_verifier',
        }),
        redirect: 'manual',
      })
      
      const responseText = await response.text()
      
      setTestResults((prev: TestResults) => ({
        ...prev,
        exchangeTest: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          type: response.type,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          isRedirect: response.status >= 300 && response.status < 400,
        }
      }))
    } catch (error) {
      setTestResults((prev: TestResults) => ({
        ...prev,
        exchangeTest: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }

  const testApiRouting = async () => {
    try {
      const response = await fetch('/api/oidc/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: 'data',
          timestamp: new Date().toISOString(),
        }),
      })
      
      const data = await response.json()
      
      setTestResults((prev: TestResults) => ({
        ...prev,
        testApiTest: {
          status: response.status,
          ok: response.ok,
          data: data,
        }
      }))
    } catch (error) {
      setTestResults((prev: TestResults) => ({
        ...prev,
        testApiTest: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }

  const getCurrentConfig = () => {
    const config = {
      origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/enterprise-callback` : 'N/A',
      issuer: 'https://panovation.i234.me:5001/webman/sso',
      clientId: 'fd1297925826a23aed846c170a33fcbc',
    }
    
    setTestResults((prev: TestResults) => ({
      ...prev,
      currentConfig: config
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">OIDC 调试工具</h1>
        
        <div className="grid gap-6">
          {/* API 路由测试 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">API 路由测试</h2>
            <div className="space-x-2 mb-4">
              <button
                onClick={testApiRouting}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                测试 /api/oidc/test
              </button>
              <button
                onClick={testExchangeApi}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                测试 /api/oidc/exchange (会失败)
              </button>
            </div>
            {testResults.testApiTest && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Test API 结果:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(testResults.testApiTest, null, 2)}
                </pre>
              </div>
            )}
            {testResults.exchangeTest && (
              <div>
                <h3 className="font-medium mb-2">Exchange API 结果:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(testResults.exchangeTest, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* 当前配置 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">当前配置</h2>
            <button
              onClick={getCurrentConfig}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
            >
              获取当前配置
            </button>
            {testResults.currentConfig && (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(testResults.currentConfig, null, 2)}
              </pre>
            )}
          </div>

          {/* 回调页面测试 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">回调页面测试</h2>
            <button
              onClick={testCallback}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
            >
              测试 /auth/enterprise-callback
            </button>
            {testResults.callbackTest && (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(testResults.callbackTest, null, 2)}
              </pre>
            )}
          </div>

          {/* Discovery 测试 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">OIDC Discovery 测试</h2>
            <button
              onClick={testDiscovery}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mb-4"
            >
              测试 OIDC Discovery
            </button>
            {testResults.discoveryTest && (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(testResults.discoveryTest, null, 2)}
              </pre>
            )}
          </div>

          {/* 手动测试链接 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">手动测试</h2>
            <div className="space-y-2">
              <a
                href="/auth/enterprise-callback"
                target="_blank"
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                直接访问 /auth/enterprise-callback
              </a>
              <a
                href="/auth/login"
                target="_blank"
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                访问登录页面
              </a>
              <a
                href="https://panovation.i234.me:5001/webman/sso/.well-known/openid-configuration"
                target="_blank"
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                直接访问 OIDC Discovery
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}