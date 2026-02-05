'use client';

import { useState, useRef, useEffect } from 'react';

interface BarcodeInputProps {
  onBarcodeSubmit?: (barcode: string) => void;
  onSubmit?: (barcode: string) => void; // Alternative prop name for compatibility
  isLoading?: boolean;
  autoFocus?: boolean;
  initialBarcode?: string;
  placeholder?: string;
}

export default function BarcodeInput({ 
  onBarcodeSubmit, 
  onSubmit, 
  isLoading = false, 
  autoFocus = true, 
  initialBarcode,
  placeholder = "请输入或扫描产品条码"
}: BarcodeInputProps) {
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Use either prop for backward compatibility
  const handleSubmitCallback = onBarcodeSubmit || onSubmit;

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim() && !isLoading && handleSubmitCallback) {
      handleSubmitCallback(barcode.trim());
      setBarcode('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcode(value);
    
    // Auto-submit when barcode scanner adds newline/enter
    if (value.includes('\n') || value.includes('\r')) {
      const cleanBarcode = value.replace(/[\n\r]/g, '').trim();
      if (cleanBarcode && !isLoading && handleSubmitCallback) {
        handleSubmitCallback(cleanBarcode);
        setBarcode('');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">扫码质检</h2>
        <p className="text-sm sm:text-base text-gray-600">请扫描产品条形码或手动输入</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
            产品条形码
          </label>
          <input
            ref={inputRef}
            id="barcode"
            type="text"
            value={barcode}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder={placeholder}
            className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-lg touch-manipulation"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <button
          type="submit"
          disabled={!barcode.trim() || isLoading}
          className="w-full bg-blue-600 text-white py-4 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation text-lg sm:text-base transform hover:scale-105 active:scale-95"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              <span className="animate-pulse">处理中...</span>
            </div>
          ) : (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              开始质检
            </span>
          )}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>支持扫码枪自动输入，或手动输入后点击按钮</p>
      </div>
    </div>
  );
}