'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { edgeInferenceService, InspectionRecord } from '@/lib/services/edgeInferenceService';

export default function HistoryPage() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchBarcode, setSearchBarcode] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadInspections();
  }, [currentPage, searchBarcode]);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const result = await edgeInferenceService.getInspections({
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        barcode: searchBarcode || undefined,
        userId: user?.id
      });
      
      setInspections(result.data);
      setTotalCount(result.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadInspections();
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'PASS':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'FAIL':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <a
                  href="/"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← 返回首页
                </a>
                <h1 className="text-2xl font-bold text-gray-900">
                  检测历史记录
                </h1>
              </div>
              <div className="text-sm text-gray-600">
                共 {totalCount} 条记录
              </div>
            </div>
          </div>
          {/* Search */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <input
                type="text"
                value={searchBarcode}
                onChange={(e) => setSearchBarcode(e.target.value)}
                placeholder="搜索条码..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                搜索
              </button>
              {searchBarcode && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchBarcode('');
                    setCurrentPage(1);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  清除
                </button>
              )}
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          )}

          {/* Inspections List */}
          {!loading && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {inspections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">暂无检测记录</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          条码
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          结果
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          检测单位
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          推理时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          检测时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状态
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inspections.map((inspection) => (
                        <tr key={inspection.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">
                              {inspection.barcode}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getDecisionColor(inspection.suggested_decision)}`}>
                              {inspection.suggested_decision === 'PASS' && '✅ 合格'}
                              {inspection.suggested_decision === 'FAIL' && '❌ 不合格'}
                              {inspection.suggested_decision === 'UNKNOWN' && '❓ 未知'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {inspection.raw_detections.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(inspection.inference_time_ms)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {inspection.created_at ? new Date(inspection.created_at).toLocaleString('zh-CN') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              inspection.status === 'completed' ? 'bg-green-100 text-green-800' :
                              inspection.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {inspection.status === 'completed' && '已完成'}
                              {inspection.status === 'failed' && '失败'}
                              {inspection.status === 'processing' && '处理中'}
                              {inspection.status === 'pending' && '等待中'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        显示第 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> 到{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, totalCount)}
                        </span>{' '}
                        条，共 <span className="font-medium">{totalCount}</span> 条记录
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          上一页
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下一页
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}