'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/lib/types/database';
import StatusTransition from '../ui/StatusTransition';

type Job = Database['public']['Tables']['jobs']['Row'];

interface ResultPanelProps {
  job: Job;
  onStartNext: () => void;
  isPolling: boolean;
}

const STATUS_CONFIG = {
  created: { 
    label: '任务已创建', 
    color: 'bg-gray-100 text-gray-800',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  },
  uploading: { 
    label: '上传中...', 
    color: 'bg-blue-100 text-blue-800',
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    )
  },
  processing: { 
    label: '分析中...', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: (
      <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    )
  },
  completed: { 
    label: '分析完成', 
    color: 'bg-green-100 text-green-800',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  },
  failed: { 
    label: '分析失败', 
    color: 'bg-red-100 text-red-800',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  },
  timeout: { 
    label: '分析超时', 
    color: 'bg-orange-100 text-orange-800',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  }
};

const RESULT_COLORS = {
  PASS: 'text-green-600 bg-green-50 border-green-200',
  FAIL: 'text-red-600 bg-red-50 border-red-200'
};

export default function ResultPanel({ job, onStartNext, isPolling }: ResultPanelProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Generate image URL from job data (assuming we have photo data)
  useEffect(() => {
    // This would typically come from the photos table or be constructed from storage path
    // For now, we'll use a placeholder or construct from job data
    if (job.id) {
      // In a real implementation, you'd fetch the actual image URL from Supabase Storage
      // setImageUrl(`/api/photos/${job.id}`);
    }
  }, [job.id]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getResultIcon = (result: Job['result']) => {
    if (result === 'PASS') {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    } else if (result === 'FAIL') {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">质检结果</h2>
        <p className="text-sm sm:text-base text-gray-600">Job ID: {job.id}</p>
      </div>

      {/* Job Info */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">条形码:</span>
            <span className="ml-2 text-gray-900 break-all">{job.barcode}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">工位:</span>
            <span className="ml-2 text-gray-900">{job.station || '未设置'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">创建时间:</span>
            <span className="ml-2 text-gray-900 text-xs sm:text-sm">{formatDateTime(job.created_at)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">更新时间:</span>
            <span className="ml-2 text-gray-900 text-xs sm:text-sm">{formatDateTime(job.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4 sm:mb-6">
        <StatusTransition
          status={job.status}
          statusConfig={STATUS_CONFIG}
          animated={true}
          showTransition={true}
        />
        {isPolling && (job.status === 'uploading' || job.status === 'processing') && (
          <span className="ml-2 text-xs text-gray-500">(轮询中...)</span>
        )}
      </div>

      {/* Result */}
      {job.result && (
        <div className="mb-4 sm:mb-6 animate-fade-in">
          <div className={`border-2 rounded-lg p-4 sm:p-6 text-center transition-all duration-500 transform hover:scale-105 ${RESULT_COLORS[job.result]}`}>
            <div className="flex items-center justify-center mb-2">
              <div className="animate-bounce">
                {getResultIcon(job.result)}
              </div>
              <span className="ml-2 text-xl sm:text-2xl font-bold animate-pulse">
                {job.result === 'PASS' ? '合格' : '不合格'}
              </span>
            </div>
            
            {job.confidence && (
              <div className="text-sm opacity-75 mb-2 animate-fade-in-delay">
                置信度: {(job.confidence * 100).toFixed(1)}%
              </div>
            )}
            
            {job.detail && (
              <div className="text-sm opacity-75 break-words animate-fade-in-delay-2">
                详情: {job.detail}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imageUrl && (
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3">拍摄照片</h3>
          <div className="border rounded-lg overflow-hidden">
            {imageError ? (
              <div className="bg-gray-100 p-6 sm:p-8 text-center text-gray-500">
                <svg className="mx-auto h-8 sm:h-12 w-8 sm:w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm sm:text-base">图片加载失败</p>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt="质检照片"
                className="w-full h-auto max-h-48 sm:max-h-64 object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {(job.status === 'failed' || job.status === 'timeout') && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <span className="text-red-800 font-medium text-sm sm:text-base">
                {job.status === 'timeout' ? '分析超时，请重试或联系技术支持' : '分析失败，请重试或联系技术支持'}
              </span>
              {job.detail && (
                <p className="mt-2 text-red-700 text-xs sm:text-sm break-words">{job.detail}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {job.status === 'completed' || job.status === 'failed' || job.status === 'timeout' ? (
          <button
            onClick={onStartNext}
            className="flex-1 bg-blue-600 text-white py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors touch-manipulation text-base sm:text-sm"
          >
            开始下一单
          </button>
        ) : (
          <div className="flex-1 bg-gray-100 text-gray-500 py-4 sm:py-3 px-4 rounded-lg font-medium text-center text-base sm:text-sm">
            等待分析完成...
          </div>
        )}
      </div>

      {/* Polling indicator */}
      {isPolling && (
        <div className="mt-4 text-center text-xs sm:text-sm text-gray-500">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            正在轮询结果状态...
          </div>
        </div>
      )}
    </div>
  );
}