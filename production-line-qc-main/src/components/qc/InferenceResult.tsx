'use client'

import { useState } from 'react'
import { InspectionRecord } from '@/lib/services/edgeInferenceService'

interface InferenceResultProps {
  result: InspectionRecord
  onClose: () => void
  onNewInspection: () => void
}

export default function InferenceResult({ result, onClose, onNewInspection }: InferenceResultProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'PASS':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'FAIL':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'PASS':
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'FAIL':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`
    }
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          {getDecisionIcon(result.suggested_decision)}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          质检结果
        </h2>
        
        <div className={`inline-flex items-center px-4 py-2 rounded-full border text-lg font-semibold ${getDecisionColor(result.suggested_decision)}`}>
          {result.suggested_decision === 'PASS' && '✅ 合格'}
          {result.suggested_decision === 'FAIL' && '❌ 不合格'}
          {result.suggested_decision === 'UNKNOWN' && '❓ 未知'}
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">产品条码</h3>
          <p className="text-lg font-mono text-gray-900">{result.barcode}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">检测单位</h3>
          <p className="text-lg font-semibold text-gray-900">
            {result.raw_detections.length} 个单位
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">推理时间</h3>
          <p className="text-lg font-semibold text-gray-900">
            {formatTime(result.inference_time_ms)}
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-1">图片尺寸</h3>
          <p className="text-lg font-semibold text-gray-900">
            {result.img_shape[0]} × {result.img_shape[1]}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {result.status === 'failed' && result.error_message && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-medium text-red-800 mb-2">错误信息</h3>
          <p className="text-sm text-red-700">{result.error_message}</p>
        </div>
      )}

      {/* Detection Details */}
      {result.raw_detections.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <h3 className="text-lg font-medium text-gray-900">
              检测详情 ({result.raw_detections.length} 项)
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showDetails && (
            <div className="mt-4 space-y-3">
              {result.raw_detections.map((detection, index) => (
                <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <span className="ml-1 font-mono">{detection.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">类别:</span>
                      <span className="ml-1 font-mono">{detection.cls}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">置信度:</span>
                      <span className="ml-1 font-mono">{(detection.conf * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">位置:</span>
                      <span className="ml-1 font-mono text-xs">
                        [{detection.xyxy.map(v => Math.round(v)).join(', ')}]
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Technical Details */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          请求ID: {result.edge_request_id}
        </button>
        {result.model_version && (
          <p className="text-sm text-gray-500">
            模型版本: {result.model_version}
          </p>
        )}
        <p className="text-sm text-gray-500">
          边缘服务: {result.edge_url}
        </p>
        {result.created_at && (
          <p className="text-sm text-gray-500">
            检测时间: {new Date(result.created_at).toLocaleString('zh-CN')}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onNewInspection}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          继续检测
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )
}