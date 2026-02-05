'use client';

/**
 * CameraCapture 组件
 * 
 * 2026-02-04 修改: 添加网络相机模式支持
 * - 新增 'network' 模式，支持边缘机海康威视工业相机
 * - 通过 /api/camera-proxy 代理转发视频流
 * - 支持从 MJPEG 流中截图
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ProgressIndicator from '../ui/ProgressIndicator';
import { edgeInferenceService, NetworkCameraDevice } from '@/lib/services/edgeInferenceService';

interface CameraCaptureProps {
  onPhotoCapture: (photoBlob: Blob) => void;
  onCancel: () => void;
  jobId: string;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

export default function CameraCapture({ onPhotoCapture, onCancel, jobId, uploadProgress = 0, uploadStatus = 'idle' }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [previewOptimized, setPreviewOptimized] = useState(false);
  // 2026-02-04: 添加 'network' 模式支持
  const [mode, setMode] = useState<'camera' | 'upload' | 'network'>('camera');
  
  // 2026-02-04: 网络相机相关状态
  const [networkCameraAvailable, setNetworkCameraAvailable] = useState(false);
  const [networkCameraLoading, setNetworkCameraLoading] = useState(false);
  const [networkCameraError, setNetworkCameraError] = useState<string | null>(null);
  const [networkCameraUrl, setNetworkCameraUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 2026-02-04: 网络相机图像引用
  const networkImageRef = useRef<HTMLImageElement>(null);

  // Get available camera devices
  const getCameraDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `相机 ${device.deviceId.slice(0, 8)}`
        }));
      
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('获取摄像头设备失败:', err);
      setError('无法获取摄像头设备列表');
    }
  }, [selectedDeviceId]);

  // 2026-02-04: 检查网络相机可用性
  const checkNetworkCamera = useCallback(async () => {
    setNetworkCameraLoading(true);
    setNetworkCameraError(null);
    
    try {
      console.log('🔍 检查网络相机可用性...');
      const available = await edgeInferenceService.checkNetworkCameraAvailable();
      setNetworkCameraAvailable(available);
      
      if (available) {
        const url = edgeInferenceService.getVideoFeedUrl();
        setNetworkCameraUrl(url);
        console.log('✅ 网络相机可用:', url);
      } else {
        console.log('⚠️ 网络相机不可用');
        setNetworkCameraError('边缘机相机未连接或服务未启动');
      }
    } catch (err) {
      console.error('❌ 检查网络相机失败:', err);
      setNetworkCameraError('无法连接到边缘机相机服务');
      setNetworkCameraAvailable(false);
    } finally {
      setNetworkCameraLoading(false);
    }
  }, []);

  // Start camera stream with optimizations
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null);
      setPermissionDenied(false);
      setPreviewOptimized(false);

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          facingMode: deviceId ? undefined : 'environment', // Prefer back camera on mobile
          frameRate: { ideal: 30, min: 15 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        
        // Optimize video element for better performance
        videoRef.current.onloadedmetadata = () => {
          setPreviewOptimized(true);
          // Auto-adjust video element size for better performance on mobile
          if (videoRef.current) {
            const video = videoRef.current;
            const aspectRatio = video.videoWidth / video.videoHeight;
            
            // Optimize for mobile screens
            if (window.innerWidth < 640) {
              video.style.maxHeight = '240px';
            } else {
              video.style.maxHeight = '400px';
            }
          }
        };
      }
    } catch (err: any) {
      console.error('启动相机失败:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('相机权限被拒绝，请在浏览器设置中允许相机访问');
      } else if (err.name === 'NotFoundError') {
        setError('未找到可用的摄像头设备');
      } else if (err.name === 'NotReadableError') {
        setError('摄像头正在被其他应用使用');
      } else {
        setError('启动相机失败，请检查设备连接');
      }
    }
  }, [stream]);

  // Initialize camera on mount (only if camera mode)
  useEffect(() => {
    if (mode === 'camera') {
      getCameraDevices().then(() => {
        if (devices.length > 0) {
          startCamera(selectedDeviceId);
        }
      });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

  // 2026-02-04: 组件挂载时检查网络相机可用性
  useEffect(() => {
    checkNetworkCamera();
  }, [checkNetworkCamera]);

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('图片文件大小不能超过10MB');
      return;
    }

    // Create preview URL
    const photoUrl = URL.createObjectURL(file);
    setCapturedPhoto(photoUrl);
    setError(null);

    // Store the file for later use
    (window as any).uploadedFile = file;
  };

  // Capture photo from camera with enhanced feedback
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    setCaptureFlash(true);
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }
    
    // Flash effect
    setTimeout(() => setCaptureFlash(false), 200);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      setError('无法获取画布上下文');
      setIsCapturing(false);
      return;
    }

    // Set canvas size to match video with optimization
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Optimize canvas size for better performance while maintaining quality
    const maxWidth = 1920;
    const maxHeight = 1080;
    
    let canvasWidth = videoWidth;
    let canvasHeight = videoHeight;
    
    if (videoWidth > maxWidth || videoHeight > maxHeight) {
      const aspectRatio = videoWidth / videoHeight;
      if (videoWidth > videoHeight) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
      } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
      }
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Apply image enhancement filters
    context.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)';
    
    // Draw video frame to canvas with smooth scaling
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(video, 0, 0, canvasWidth, canvasHeight);

    // Convert to blob with optimized quality
    canvas.toBlob((blob) => {
      if (blob) {
        const photoUrl = URL.createObjectURL(blob);
        setCapturedPhoto(photoUrl);
        
        // Add success feedback
        setTimeout(() => {
          setIsCapturing(false);
        }, 300);
      } else {
        setError('拍照失败，请重试');
        setIsCapturing(false);
      }
    }, 'image/jpeg', 0.85); // Slightly higher quality for better results
  };

  // 2026-02-04: 从网络相机截图
  const captureNetworkPhoto = () => {
    if (!networkImageRef.current || !canvasRef.current) {
      setError('网络相机未就绪');
      return;
    }

    setIsCapturing(true);
    setCaptureFlash(true);
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Flash effect
    setTimeout(() => setCaptureFlash(false), 200);
    
    const img = networkImageRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      setError('无法获取画布上下文');
      setIsCapturing(false);
      return;
    }

    // 获取图像实际尺寸
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    
    if (imgWidth === 0 || imgHeight === 0) {
      setError('无法获取网络相机图像');
      setIsCapturing(false);
      return;
    }

    // Set canvas size
    canvas.width = imgWidth;
    canvas.height = imgHeight;

    // Draw image to canvas
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(img, 0, 0, imgWidth, imgHeight);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const photoUrl = URL.createObjectURL(blob);
        setCapturedPhoto(photoUrl);
        
        setTimeout(() => {
          setIsCapturing(false);
        }, 300);
      } else {
        setError('截图失败，请重试');
        setIsCapturing(false);
      }
    }, 'image/jpeg', 0.9);
  };

  // Confirm photo and submit
  const confirmPhoto = () => {
    if (mode === 'camera' && canvasRef.current) {
      // Camera mode: get blob from canvas
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onPhotoCapture(blob);
        }
      }, 'image/jpeg', 0.8);
    } else if (mode === 'upload') {
      // Upload mode: get file from window storage
      const file = (window as any).uploadedFile;
      if (file) {
        onPhotoCapture(file);
      }
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedPhoto(null);
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }
    // Clear uploaded file
    if ((window as any).uploadedFile) {
      delete (window as any).uploadedFile;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Switch mode - 2026-02-04: 添加 network 模式支持
  const switchMode = (newMode: 'camera' | 'upload' | 'network') => {
    setMode(newMode);
    setCapturedPhoto(null);
    setError(null);
    
    if (newMode === 'upload' || newMode === 'network') {
      // Stop local camera when switching to upload or network mode
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    
    if (newMode === 'camera') {
      // Start camera when switching to camera mode
      getCameraDevices().then(() => {
        if (devices.length > 0) {
          startCamera(selectedDeviceId);
        }
      });
    }
    
    if (newMode === 'network') {
      // 2026-02-04: 切换到网络相机时重新检查可用性
      checkNetworkCamera();
    }
  };

  // Request permission
  const requestPermission = () => {
    startCamera(selectedDeviceId);
  };

  if (permissionDenied && mode === 'camera') {
    return (
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">需要相机权限</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">请允许访问相机以进行拍照质检</p>
          <div className="space-y-3">
            <button
              onClick={requestPermission}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
            >
              重新请求权限
            </button>
            <button
              onClick={() => switchMode('upload')}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors touch-manipulation"
            >
              改用本地上传
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors touch-manipulation"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && mode === 'camera') {
    return (
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">相机错误</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
            >
              重试
            </button>
            <button
              onClick={() => switchMode('upload')}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors touch-manipulation"
            >
              改用本地上传
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors touch-manipulation"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">拍摄产品照片</h2>
        <p className="text-sm sm:text-base text-gray-600">Job ID: {jobId}</p>
      </div>

      {/* Mode selector - 2026-02-04: 添加网络相机选项 */}
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 p-1 rounded-lg flex flex-wrap justify-center gap-1">
          <button
            onClick={() => switchMode('camera')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation ${
              mode === 'camera'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">本地相机</span>
            <span className="sm:hidden">本地</span>
          </button>
          {/* 2026-02-04: 网络相机按钮 */}
          <button
            onClick={() => switchMode('network')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation relative ${
              mode === 'network'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">网络相机</span>
            <span className="sm:hidden">网络</span>
            {/* 状态指示器 */}
            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
              networkCameraLoading ? 'bg-yellow-500 animate-pulse' :
              networkCameraAvailable ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
          </button>
          <button
            onClick={() => switchMode('upload')}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation ${
              mode === 'upload'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="hidden sm:inline">本地上传</span>
            <span className="sm:hidden">上传</span>
          </button>
        </div>
      </div>

      {/* Camera device selector */}
      {mode === 'camera' && devices.length > 1 && !capturedPhoto && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择摄像头
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* File upload input */}
      {mode === 'upload' && !capturedPhoto && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择图片文件
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            支持 JPG、PNG 等图片格式，最大 10MB
          </p>
        </div>
      )}

      {/* Error display for upload mode */}
      {error && mode === 'upload' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Camera preview or uploaded photo */}
      <div className="relative mb-4 bg-black rounded-lg overflow-hidden">
        {capturedPhoto ? (
          <div className="relative">
            <img
              src={capturedPhoto}
              alt="拍摄的照片"
              className="w-full h-auto max-h-64 sm:max-h-96 object-contain animate-scale-in"
            />
            {/* Success overlay */}
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-2 animate-bounce">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ) : mode === 'network' ? (
          /* 2026-02-04: 网络相机视频流显示 */
          <div className="relative">
            {networkCameraLoading ? (
              <div className="w-full h-48 sm:h-64 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">正在连接网络相机...</p>
                </div>
              </div>
            ) : networkCameraError ? (
              <div className="w-full h-48 sm:h-64 flex items-center justify-center text-white">
                <div className="text-center p-4">
                  <svg className="mx-auto h-10 w-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-red-300 mb-2">{networkCameraError}</p>
                  <button
                    onClick={checkNetworkCamera}
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    重新连接
                  </button>
                </div>
              </div>
            ) : networkCameraUrl ? (
              <div className="relative">
                {/* MJPEG 视频流 */}
                <img
                  ref={networkImageRef}
                  src={networkCameraUrl}
                  alt="网络相机画面"
                  className="w-full h-auto max-h-64 sm:max-h-96 object-contain"
                  onError={() => {
                    setNetworkCameraError('视频流加载失败');
                    setNetworkCameraAvailable(false);
                  }}
                  crossOrigin="anonymous"
                />
                {/* 网络相机标识 */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  边缘机相机 (海康威视)
                </div>
                {/* 截图指引 */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  点击下方按钮截取当前画面
                </div>
                {/* Flash effect */}
                {captureFlash && (
                  <div className="absolute inset-0 bg-white animate-ping opacity-80"></div>
                )}
              </div>
            ) : (
              <div className="w-full h-48 sm:h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">网络相机未连接</p>
                  <button
                    onClick={checkNetworkCamera}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    检查连接
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : mode === 'camera' ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-auto max-h-64 sm:max-h-96 object-contain transition-all duration-500 ${
                previewOptimized ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
              }`}
              style={{
                filter: previewOptimized ? 'none' : 'blur(1px)',
              }}
            />
            
            {/* Camera overlay guides */}
            {previewOptimized && !isCapturing && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Center focus guide */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white border-opacity-50 rounded-lg animate-pulse">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                </div>
                
                {/* Instructions */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  将产品对准中心框内
                </div>
              </div>
            )}
            
            {/* Flash effect */}
            {captureFlash && (
              <div className="absolute inset-0 bg-white animate-ping opacity-80"></div>
            )}
            
            {/* Loading overlay with enhanced animation */}
            {isCapturing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-base sm:text-lg flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  <span className="animate-pulse">拍照中...</span>
                </div>
              </div>
            )}
            
            {/* Camera not ready overlay */}
            {!previewOptimized && stream && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <div className="text-white text-sm flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  相机准备中...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 sm:h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-8 sm:h-12 w-8 sm:w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm sm:text-base">请选择图片文件</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadStatus !== 'idle' && (
        <div className="mb-4">
          <ProgressIndicator
            progress={uploadProgress}
            status={uploadStatus}
            animated={true}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {capturedPhoto ? (
          <>
            <button
              onClick={retakePhoto}
              disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              className="flex-1 bg-gray-300 text-gray-700 py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors touch-manipulation text-base sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* 2026-02-04: 根据模式显示不同文字 */}
              重新{mode === 'camera' ? '拍照' : mode === 'network' ? '截图' : '选择'}
            </button>
            <button
              onClick={confirmPhoto}
              disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              className="flex-1 bg-green-600 text-white py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors touch-manipulation text-base sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              {uploadStatus === 'uploading' || uploadStatus === 'processing' ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {uploadStatus === 'uploading' ? '上传中...' : '处理中...'}
                </div>
              ) : (
                '确认上传'
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onCancel}
              disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              className="flex-1 bg-gray-300 text-gray-700 py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors touch-manipulation text-base sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            {mode === 'camera' ? (
              <button
                onClick={capturePhoto}
                disabled={!stream || isCapturing || !previewOptimized || uploadStatus === 'uploading' || uploadStatus === 'processing'}
                className="flex-1 bg-blue-600 text-white py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation text-base sm:text-sm relative overflow-hidden transform hover:scale-105 active:scale-95"
              >
                {isCapturing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="animate-pulse">拍照中...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    拍照
                    {/* Pulse effect for ready state */}
                    {previewOptimized && !isCapturing && (
                      <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity duration-200"></div>
                    )}
                  </>
                )}
              </button>
            ) : mode === 'network' ? (
              /* 2026-02-04: 网络相机截图按钮 */
              <button
                onClick={captureNetworkPhoto}
                disabled={!networkCameraAvailable || isCapturing || uploadStatus === 'uploading' || uploadStatus === 'processing'}
                className="flex-1 bg-green-600 text-white py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation text-base sm:text-sm relative overflow-hidden transform hover:scale-105 active:scale-95"
              >
                {isCapturing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="animate-pulse">截图中...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    截取画面
                    {networkCameraAvailable && !isCapturing && (
                      <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity duration-200"></div>
                    )}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
                className="flex-1 bg-blue-600 text-white py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors touch-manipulation text-base sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                选择图片
              </button>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}