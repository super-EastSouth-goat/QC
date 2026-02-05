'use client'

import { useState, useRef, useEffect } from 'react'
import { InspectionRecord, EdgeDetection } from '@/lib/services/edgeInferenceService'

interface DetectionVisualizationProps {
  result: InspectionRecord
  originalImage: Blob
  onContinue: () => void
  onRetake: () => void
}

export default function DetectionVisualization({ 
  result, 
  originalImage, 
  onContinue, 
  onRetake 
}: DetectionVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    drawDetections()
  }, [result, originalImage])

  const drawDetections = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create image from blob
    const imageUrl = URL.createObjectURL(originalImage)
    const img = new Image()
    
    img.onload = () => {
      // Get the actual image dimensions
      const actualImageWidth = img.naturalWidth
      const actualImageHeight = img.naturalHeight
      
      console.log('🖼️ Image info:', {
        naturalSize: `${actualImageWidth} × ${actualImageHeight}`,
        reportedSize: `${result.img_shape[0]} × ${result.img_shape[1]}`,
        detections: result.raw_detections.length
      })
      
      // Set canvas size to match image aspect ratio but limit max size
      const maxWidth = 800
      const maxHeight = 600
      
      let canvasWidth = actualImageWidth
      let canvasHeight = actualImageHeight
      
      // Scale down if image is too large
      if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
        const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight)
        canvasWidth *= scale
        canvasHeight *= scale
      }
      
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      
      // Draw original image
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
      
      // Calculate scale factors based on ACTUAL image dimensions vs reported dimensions
      // The detection coordinates are based on the reported img_shape, not the actual image size
      const scaleX = canvasWidth / result.img_shape[0]
      const scaleY = canvasHeight / result.img_shape[1]
      
      console.log('📐 Scale factors:', {
        scaleX: scaleX.toFixed(4),
        scaleY: scaleY.toFixed(4),
        canvasSize: `${canvasWidth} × ${canvasHeight}`,
        coordinateSpace: `${result.img_shape[0]} × ${result.img_shape[1]}`
      })
      
      // Draw detection boxes
      result.raw_detections.forEach((detection, index) => {
        console.log(`🎯 Detection ${index + 1}:`, {
          id: detection.id,
          cls: detection.cls,
          conf: detection.conf.toFixed(3),
          xyxy: detection.xyxy.map(v => Math.round(v))
        })
        drawDetectionBox(ctx, detection, scaleX, scaleY, index)
      })
      
      setImageLoaded(true)
      URL.revokeObjectURL(imageUrl)
    }
    
    img.onerror = (error) => {
      console.error('❌ Image load error:', error)
      URL.revokeObjectURL(imageUrl)
    }
    
    img.src = imageUrl
  }

  const drawDetectionBox = (
    ctx: CanvasRenderingContext2D, 
    detection: EdgeDetection, 
    scaleX: number, 
    scaleY: number,
    index: number
  ) => {
    const [x1, y1, x2, y2] = detection.xyxy
    
    // Scale coordinates to canvas size
    const scaledX1 = x1 * scaleX
    const scaledY1 = y1 * scaleY
    const scaledX2 = x2 * scaleX
    const scaledY2 = y2 * scaleY
    
    const width = scaledX2 - scaledX1
    const height = scaledY2 - scaledY1
    
    console.log(`📦 Drawing box ${index + 1}:`, {
      original: `(${x1.toFixed(1)}, ${y1.toFixed(1)}) → (${x2.toFixed(1)}, ${y2.toFixed(1)})`,
      scaled: `(${scaledX1.toFixed(1)}, ${scaledY1.toFixed(1)}) → (${scaledX2.toFixed(1)}, ${scaledY2.toFixed(1)})`,
      size: `${width.toFixed(1)} × ${height.toFixed(1)}`
    })
    
    // Choose color based on detection class
    const color = getDetectionColor(detection.cls)
    
    // Draw bounding box with thicker line for better visibility
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(scaledX1, scaledY1, width, height)
    
    // Draw semi-transparent background for label
    const labelWidth = Math.max(width, 100)
    const labelHeight = 20
    ctx.fillStyle = color + 'CC' // More opaque background
    ctx.fillRect(scaledX1, scaledY1 - labelHeight, labelWidth, labelHeight)
    
    // Draw label text
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(
      `${detection.cls} ${(detection.conf * 100).toFixed(0)}%`,
      scaledX1 + 2,
      scaledY1 - 6
    )
    
    // Draw detection number in center of box
    if (width > 20 && height > 20) {
      ctx.fillStyle = color
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Add white outline for better visibility
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3
      ctx.strokeText(
        `${index + 1}`,
        scaledX1 + width / 2,
        scaledY1 + height / 2
      )
      
      ctx.fillText(
        `${index + 1}`,
        scaledX1 + width / 2,
        scaledY1 + height / 2
      )
      
      // Reset text baseline
      ctx.textBaseline = 'alphabetic'
    }
  }

  const getDetectionColor = (cls: string): string => {
    // Color mapping for different detection classes
    const colorMap: { [key: string]: string } = {
      'stud_ok': '#10B981',      // Green for OK studs
      'stud_ng': '#EF4444',      // Red for NG studs
      'screw_ok': '#3B82F6',     // Blue for OK screws
      'screw_ng': '#F59E0B',     // Orange for NG screws
      'crack': '#DC2626',        // Dark red for cracks
      'scratch': '#F97316',      // Orange for scratches
      'dent': '#8B5CF6',         // Purple for dents
      'missing': '#EC4899',      // Pink for missing parts
    }
    
    return colorMap[cls] || '#6B7280' // Default gray
  }

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
        return '✅'
      case 'FAIL':
        return '❌'
      default:
        return '❓'
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          检测结果可视化
        </h2>
        <div className={`inline-flex items-center px-4 py-2 rounded-full border text-lg font-semibold ${getDecisionColor(result.suggested_decision)}`}>
          {getDecisionIcon(result.suggested_decision)} {result.suggested_decision === 'PASS' ? '合格' : result.suggested_decision === 'FAIL' ? '不合格' : '未知'}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image with Detections */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              检测结果图像 ({result.raw_detections.length} 个检测单位)
            </h3>
            
            {!imageLoaded && (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">正在加载图像...</p>
                </div>
              </div>
            )}
            
            <canvas
              ref={canvasRef}
              className={`max-w-full h-auto rounded-lg shadow-md ${!imageLoaded ? 'hidden' : ''}`}
              style={{ border: '2px solid #e5e7eb' }}
            />
            
            {imageLoaded && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                原图尺寸: {result.img_shape[0]} × {result.img_shape[1]} | 
                推理时间: {result.inference_time_ms}ms
              </p>
            )}
          </div>
        </div>

        {/* Detection Details */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">检测摘要</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">产品条码:</span>
                <span className="font-mono">{result.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">检测单位:</span>
                <span className="font-semibold">{result.raw_detections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">推理时间:</span>
                <span>{result.inference_time_ms}ms</span>
              </div>
            </div>
          </div>

          {/* Detection List */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">检测详情</h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showDetails ? '收起' : '展开'}
              </button>
            </div>
            
            {showDetails && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.raw_detections.map((detection, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: getDetectionColor(detection.cls) }}
                    ></div>
                    <div className="flex-1 text-xs">
                      <div className="font-medium">{index + 1}. {detection.cls}</div>
                      <div className="text-gray-500">置信度: {(detection.conf * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debug Info (only show in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">调试信息</h3>
              <div className="text-xs space-y-1 text-yellow-700">
                <div>报告图片尺寸: {result.img_shape[0]} × {result.img_shape[1]}</div>
                <div>Canvas 尺寸: {canvasRef.current?.width} × {canvasRef.current?.height}</div>
                <div>检测坐标示例 (前3个):</div>
                {result.raw_detections.slice(0, 3).map((det, i) => (
                  <div key={i} className="ml-2">
                    {i + 1}. {det.cls}: [{det.xyxy.map(v => Math.round(v)).join(', ')}]
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color Legend */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">颜色说明</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }}></div>
                <span>螺柱正常</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
                <span>螺柱异常</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                <span>螺丝正常</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
                <span>螺丝异常</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={onRetake}
          className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
        >
          重新拍照
        </button>
        <button
          onClick={onContinue}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          查看详细结果
        </button>
      </div>
    </div>
  )
}