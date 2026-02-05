'use client';

import { useEffect, useState } from 'react';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  status?: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  animated?: boolean;
}

export default function ProgressIndicator({ 
  progress, 
  status = 'uploading', 
  message,
  animated = true 
}: ProgressIndicatorProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animate progress changes
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-600';
      case 'processing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return `上传中... ${Math.round(displayProgress)}%`;
      case 'processing':
        return '分析中...';
      case 'completed':
        return '完成';
      case 'error':
        return '上传失败';
      default:
        return '';
    }
  };

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${getStatusColor()}`}
          style={{ 
            width: `${displayProgress}%`,
            transform: animated ? 'translateX(0)' : undefined
          }}
        >
          {/* Animated shimmer effect for active states */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center justify-center text-sm text-gray-600">
        <span className="mr-2 text-gray-500">
          {getStatusIcon()}
        </span>
        <span className="font-medium">
          {getStatusMessage()}
        </span>
      </div>
    </div>
  );
}