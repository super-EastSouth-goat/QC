'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'

export default function DebugStoragePage() {
  const { user } = useAuth()
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (test: string, result: any) => {
    setTestResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }])
  }

  const testStorage = async () => {
    setLoading(true)
    setTestResults([])
    
    const supabase = createClient()

    // Test 1: Check authentication
    addResult('Authentication Status', {
      user: user ? {
        id: user.id,
        email: user.email
      } : null
    })

    if (!user) {
      addResult('Error', 'No authenticated user - please log in first')
      setLoading(false)
      return
    }

    // Test 2: List buckets
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        addResult('List Buckets Error', bucketsError)
      } else {
        addResult('Available Buckets', buckets)
      }
    } catch (error) {
      addResult('List Buckets Exception', error)
    }

    // Test 3: Test upload with user folder structure (correct way)
    try {
      const testContent = new Blob(['This is a test file'], { type: 'text/plain' })
      const testFileName = `${user.id}/test-${Date.now()}.txt`
      
      addResult('Upload Test - Correct Path', {
        fileName: testFileName,
        fileSize: testContent.size
      })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('qc-images')
        .upload(testFileName, testContent, {
          contentType: 'text/plain'
        })

      if (uploadError) {
        addResult('Upload Error (Correct Path)', uploadError)
      } else {
        addResult('Upload Success (Correct Path)', uploadData)
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('qc-images')
          .getPublicUrl(uploadData.path)
        
        addResult('Public URL', urlData.publicUrl)
        
        // Clean up
        const { error: deleteError } = await supabase.storage
          .from('qc-images')
          .remove([testFileName])
        
        if (deleteError) {
          addResult('Cleanup Error', deleteError)
        } else {
          addResult('Cleanup Success', 'Test file removed')
        }
      }
    } catch (error) {
      addResult('Upload Exception (Correct Path)', error)
    }

    // Test 4: Test upload without user folder (should fail)
    try {
      const testContent = new Blob(['This should fail'], { type: 'text/plain' })
      const badFileName = `test-no-folder-${Date.now()}.txt`
      
      addResult('Upload Test - Wrong Path', {
        fileName: badFileName,
        expected: 'Should fail due to RLS'
      })

      const { data: badUploadData, error: badUploadError } = await supabase.storage
        .from('qc-images')
        .upload(badFileName, testContent, {
          contentType: 'text/plain'
        })

      if (badUploadError) {
        addResult('Upload Error (Wrong Path) - Expected', badUploadError)
      } else {
        addResult('Upload Success (Wrong Path) - Unexpected!', badUploadData)
        
        // Clean up unexpected success
        await supabase.storage.from('qc-images').remove([badFileName])
      }
    } catch (error) {
      addResult('Upload Exception (Wrong Path)', error)
    }

    // Test 5: Test image upload (like real usage)
    try {
      // Create a small test image
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'red'
        ctx.fillRect(0, 0, 100, 100)
        ctx.fillStyle = 'white'
        ctx.font = '20px Arial'
        ctx.fillText('TEST', 25, 55)
      }
      
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png')
      })

      const imageFileName = `${user.id}/test-image-${Date.now()}.png`
      
      addResult('Image Upload Test', {
        fileName: imageFileName,
        fileSize: imageBlob.size,
        fileType: imageBlob.type
      })

      const { data: imageUploadData, error: imageUploadError } = await supabase.storage
        .from('qc-images')
        .upload(imageFileName, imageBlob, {
          contentType: 'image/png'
        })

      if (imageUploadError) {
        addResult('Image Upload Error', imageUploadError)
      } else {
        addResult('Image Upload Success', imageUploadData)
        
        // Get public URL
        const { data: imageUrlData } = supabase.storage
          .from('qc-images')
          .getPublicUrl(imageUploadData.path)
        
        addResult('Image Public URL', imageUrlData.publicUrl)
        
        // Clean up
        const { error: imageDeleteError } = await supabase.storage
          .from('qc-images')
          .remove([imageFileName])
        
        if (imageDeleteError) {
          addResult('Image Cleanup Error', imageDeleteError)
        } else {
          addResult('Image Cleanup Success', 'Test image removed')
        }
      }
    } catch (error) {
      addResult('Image Upload Exception', error)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Storage 调试工具</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">当前状态</h2>
          <div className="space-y-2 text-sm">
            <div><strong>用户:</strong> {user ? `${user.email} (${user.id})` : '未登录'}</div>
            <div><strong>Bucket:</strong> qc-images</div>
          </div>
        </div>

        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              ⚠️ 请先登录才能测试 Storage 功能
            </p>
            <a href="/auth/login" className="text-blue-600 hover:underline">
              前往登录页面
            </a>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={testStorage}
            disabled={loading || !user}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '测试中...' : '开始 Storage 测试'}
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
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
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