'use client';

interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'text' | 'avatar' | 'button';
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({ 
  variant = 'text', 
  count = 1, 
  className = '' 
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
              <div className="mt-4 flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
            <div className="animate-pulse">
              {/* Table Header */}
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              {/* Table Rows */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-4 py-3 border-b border-gray-100">
                  <div className="flex space-x-4">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'avatar':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          </div>
        );

      case 'button':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
          </div>
        );

      case 'text':
      default:
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={count > 1 ? 'mb-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
}