'use client';

import { useEffect, useState } from 'react';

interface StatusTransitionProps {
  status: string;
  statusConfig: Record<string, { label: string; color: string; icon?: React.ReactNode }>;
  animated?: boolean;
  showTransition?: boolean;
}

export default function StatusTransition({ 
  status, 
  statusConfig, 
  animated = true,
  showTransition = true 
}: StatusTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(status);

  useEffect(() => {
    if (status !== previousStatus && showTransition && animated) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousStatus(status);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setPreviousStatus(status);
    }
  }, [status, previousStatus, showTransition, animated]);

  const currentConfig = statusConfig[status];
  
  if (!currentConfig) {
    return null;
  }

  return (
    <div className="relative">
      <span 
        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-all duration-300 ${
          currentConfig.color
        } ${
          isTransitioning ? 'scale-110 shadow-lg' : 'scale-100'
        } ${
          animated ? 'transform' : ''
        }`}
      >
        {currentConfig.icon && (
          <span className="mr-1">
            {currentConfig.icon}
          </span>
        )}
        {currentConfig.label}
        
        {/* Pulse animation for active states */}
        {(status === 'uploading' || status === 'processing') && (
          <span className="absolute -inset-1 rounded-full bg-current opacity-20 animate-ping"></span>
        )}
      </span>
      
      {/* Success animation */}
      {status === 'completed' && isTransitioning && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
}