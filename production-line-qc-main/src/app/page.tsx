'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { AuthGuard } from '@/components/auth/AuthGuard';
import BarcodeInput from '@/components/qc/BarcodeInput';
import CameraCapture from '@/components/qc/CameraCapture';
import DetectionVisualization from '@/components/qc/DetectionVisualization';
import InferenceResult from '@/components/qc/InferenceResult';
import { edgeInferenceService, InspectionRecord } from '@/lib/services/edgeInferenceService';

type AppState = 'barcode' | 'camera' | 'processing' | 'visualization' | 'result';

interface ProcessingStatus {
  stage: string;
  progress: number;
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('barcode');
  const [barcode, setBarcode] = useState('');
  const [jobId, setJobId] = useState('');
  const [originalImage, setOriginalImage] = useState<Blob | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({ stage: '', progress: 0 });
  const [result, setResult] = useState<InspectionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edgeApiHealth, setEdgeApiHealth] = useState<{
    isHealthy: boolean;
    responseTime?: number;
    error?: string;
    modelLoaded?: boolean;
  } | null>(null);

  // Check edge API health on component mount
  useEffect(() => {
    checkEdgeApiHealth();
  }, []);

  const checkEdgeApiHealth = async () => {
    try {
      const health = await edgeInferenceService.checkHealth();
      setEdgeApiHealth(health);
    } catch (error) {
      console.error('Failed to check edge API health:', error);
      setEdgeApiHealth({
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleBarcodeSubmit = (inputBarcode: string) => {
    setBarcode(inputBarcode);
    setJobId(`job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    setError(null);
    setCurrentState('camera');
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    setOriginalImage(photoBlob); // Save original image for visualization
    setCurrentState('processing');
    setProcessingStatus({ stage: '准备处理...', progress: 0 });
    
    try {
      console.log('🚀 Starting inference workflow:', {
        barcode,
        fileSize: photoBlob.size,
        fileType: photoBlob.type
      });

      const inspectionResult = await edgeInferenceService.processInference(
        photoBlob,
        barcode,
        (stage, progress) => {
          setProcessingStatus({ stage, progress });
        }
      );

      console.log('✅ Inference completed:', inspectionResult);
      
      setResult(inspectionResult);
      setCurrentState('visualization'); // Show visualization first
    } catch (error) {
      console.error('❌ Inference failed:', error);
      setError(error instanceof Error ? error.message : '推理处理失败，请重试');
      setCurrentState('camera'); // Go back to camera for retry
    }
  };

  const handleCameraCancel = () => {
    setCurrentState('barcode');
    setBarcode('');
    setJobId('');
    setOriginalImage(null);
    setError(null);
  };

  const handleVisualizationContinue = () => {
    setCurrentState('result');
  };

  const handleVisualizationRetake = () => {
    setCurrentState('camera');
    setResult(null);
    setError(null);
  };

  const handleResultClose = () => {
    setCurrentState('barcode');
    setBarcode('');
    setJobId('');
    setOriginalImage(null);
    setResult(null);
    setError(null);
  };

  const handleNewInspection = () => {
    setCurrentState('barcode');
    setBarcode('');
    setJobId('');
    setOriginalImage(null);
    setResult(null);
    setError(null);
  };

  const getUploadStatus = () => {
    if (currentState === 'processing') {
      if (processingStatus.progress < 50) return 'uploading';
      if (processingStatus.progress < 100) return 'processing';
      return 'completed';
    }
    return 'idle';
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Edge API Status Card */}
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  edgeApiHealth?.isHealthy ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-900">
                  边缘推理服务
                </span>
                <span className={`text-sm ${
                  edgeApiHealth?.isHealthy ? 'text-green-600' : 'text-red-600'
                }`}>
                  {edgeApiHealth?.isHealthy ? '在线' : '离线'}
                </span>
                {edgeApiHealth?.responseTime && (
                  <span className="text-xs text-gray-500">
                    ({edgeApiHealth.responseTime}ms)
                  </span>
                )}
              </div>
              <button
                onClick={checkEdgeApiHealth}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                检查状态
              </button>
            </div>
          </div>
          {/* Edge API Health Warning */}
          {edgeApiHealth && !edgeApiHealth.isHealthy && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">边缘推理服务异常</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {edgeApiHealth.error || '无法连接到边缘推理服务，请检查网络连接或联系管理员'}
                  </p>
                  <button
                    onClick={checkEdgeApiHealth}
                    className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 underline"
                  >
                    重新检查
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">处理错误</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content based on current state */}
          <div className="flex justify-center">
            {currentState === 'barcode' && (
              <BarcodeInput
                onBarcodeSubmit={handleBarcodeSubmit}
                placeholder="请输入或扫描产品条码"
              />
            )}

            {currentState === 'camera' && (
              <CameraCapture
                jobId={jobId}
                onPhotoCapture={handlePhotoCapture}
                onCancel={handleCameraCancel}
                uploadProgress={processingStatus.progress}
                uploadStatus={getUploadStatus()}
              />
            )}

            {currentState === 'processing' && (
              <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    正在处理图片
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {processingStatus.stage}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingStatus.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {processingStatus.progress}%
                  </p>
                </div>
              </div>
            )}

            {currentState === 'visualization' && result && originalImage && (
              <DetectionVisualization
                result={result}
                originalImage={originalImage}
                onContinue={handleVisualizationContinue}
                onRetake={handleVisualizationRetake}
              />
            )}

            {currentState === 'result' && result && (
              <InferenceResult
                result={result}
                onClose={handleResultClose}
                onNewInspection={handleNewInspection}
              />
            )}
          </div>

          {/* Quick Actions */}
          {currentState === 'barcode' && (
            <div className="mt-8 text-center">
              <div className="inline-flex space-x-4">
                <a
                  href="/history"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  查看历史记录
                </a>
                <span className="text-gray-300">|</span>
                <button
                  onClick={checkEdgeApiHealth}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  检查系统状态
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}