'use client';

import { useState, useEffect } from 'react';
import { edgeApiService } from '@/lib/services';
import type { MockConfig } from '@/lib/services/mockEdgeApi';

export default function MockApiConfig() {
  const initialMockConfig = edgeApiService.getMockConfig();
  const [config, setConfig] = useState<MockConfig | null>(initialMockConfig);
  const [isVisible, setIsVisible] = useState(!!initialMockConfig);

  const updateConfig = (updates: Partial<MockConfig>) => {
    if (!config) return;
    
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    edgeApiService.updateMockConfig(updates);
  };

  const resetToPreset = (preset: 'development' | 'demo' | 'testing' | 'production') => {
    edgeApiService.resetMockConfig(preset);
    const newConfig = edgeApiService.getMockConfig();
    if (newConfig) {
      setConfig(newConfig);
    }
  };

  if (!isVisible || !config) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">模拟API配置</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {/* 模式选择 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              模拟模式
            </label>
            <select
              value={config.mode}
              onChange={(e) => updateConfig({ mode: e.target.value as MockConfig['mode'] })}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="random">随机模式</option>
              <option value="realistic">真实模式</option>
              <option value="demo">演示模式</option>
              <option value="testing">测试模式</option>
            </select>
          </div>

          {/* 通过率 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              通过率: {Math.round(config.passRate * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.passRate}
              onChange={(e) => updateConfig({ passRate: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 错误率 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              错误率: {Math.round(config.errorRate * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={config.errorRate}
              onChange={(e) => updateConfig({ errorRate: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 延迟设置 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              延迟: {config.delay.min}ms - {config.delay.max}ms
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={config.delay.min}
                onChange={(e) => updateConfig({ 
                  delay: { ...config.delay, min: parseInt(e.target.value) || 0 }
                })}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="最小"
              />
              <input
                type="number"
                value={config.delay.max}
                onChange={(e) => updateConfig({ 
                  delay: { ...config.delay, max: parseInt(e.target.value) || 1000 }
                })}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="最大"
              />
            </div>
          </div>

          {/* 预设配置 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              快速预设
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => resetToPreset('development')}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                开发
              </button>
              <button
                onClick={() => resetToPreset('demo')}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                演示
              </button>
              <button
                onClick={() => resetToPreset('testing')}
                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                测试
              </button>
              <button
                onClick={() => resetToPreset('production')}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                生产
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 悬浮按钮组件
export function MockApiToggle() {
  const [showConfig, setShowConfig] = useState(false);
  const initialMockConfig = edgeApiService.getMockConfig();
  const [isMockMode, setIsMockMode] = useState(!!initialMockConfig);

  if (!isMockMode) {
    return null;
  }

  return (
    <>
      {!showConfig && (
        <button
          onClick={() => setShowConfig(true)}
          className="fixed bottom-4 right-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="模拟API配置"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
      
      {showConfig && <MockApiConfig />}
    </>
  );
}