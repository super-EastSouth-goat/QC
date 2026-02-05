'use client';

import { useState, useMemo } from 'react';
import { Database } from '@/lib/types/database';

type Job = Database['public']['Tables']['jobs']['Row'];
type User = Database['public']['Tables']['profiles']['Row'];

interface FilterOptions {
  dateFrom?: string;
  dateTo?: string;
  status?: Job['status'] | 'all';
  result?: Job['result'] | 'all';
}

interface HistoryTableProps {
  jobs: Job[];
  onFilter: (filters: FilterOptions) => void;
  currentUser: User;
}

interface Statistics {
  totalCount: number;
  todayCount: number;
  passCount: number;
  failCount: number;
  todayPassCount: number;
  todayFailCount: number;
}

export default function HistoryTable({ jobs, onFilter, currentUser }: HistoryTableProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    result: 'all'
  });
  const [sortField, setSortField] = useState<keyof Job>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Calculate statistics
  const statistics = useMemo((): Statistics => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const totalCount = jobs.length;
    const todayJobs = jobs.filter(job => job.created_at >= todayISO);
    const todayCount = todayJobs.length;
    
    const passJobs = jobs.filter(job => job.result === 'PASS');
    const failJobs = jobs.filter(job => job.result === 'FAIL');
    const passCount = passJobs.length;
    const failCount = failJobs.length;

    const todayPassCount = todayJobs.filter(job => job.result === 'PASS').length;
    const todayFailCount = todayJobs.filter(job => job.result === 'FAIL').length;

    return {
      totalCount,
      todayCount,
      passCount,
      failCount,
      todayPassCount,
      todayFailCount
    };
  }, [jobs]);

  // Sort jobs
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [jobs, sortField, sortDirection]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilter(updatedFilters);
  };

  const handleSort = (field: keyof Job) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: Job['status']) => {
    const statusConfig = {
      created: { label: '已创建', color: 'bg-gray-100 text-gray-800' },
      uploading: { label: '上传中', color: 'bg-blue-100 text-blue-800' },
      processing: { label: '分析中', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
      failed: { label: '失败', color: 'bg-red-100 text-red-800' },
      timeout: { label: '超时', color: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getResultBadge = (result: Job['result']) => {
    if (!result) return <span className="text-gray-400">-</span>;
    
    const resultConfig = {
      PASS: { label: '合格', color: 'bg-green-100 text-green-800' },
      FAIL: { label: '不合格', color: 'bg-red-100 text-red-800' }
    };

    const config = resultConfig[result];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getSortIcon = (field: keyof Job) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">质检历史记录</h2>
        <p className="text-sm sm:text-base text-gray-600">
          {currentUser.role === 'admin' || currentUser.role === 'supervisor' || currentUser.role === 'engineer' 
            ? '全量历史记录' 
            : '个人历史记录'}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="text-lg sm:text-2xl font-bold text-blue-600">{statistics.todayCount}</div>
          <div className="text-xs sm:text-sm text-blue-800">今日上传</div>
        </div>
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="text-lg sm:text-2xl font-bold text-green-600">{statistics.todayPassCount}</div>
          <div className="text-xs sm:text-sm text-green-800">今日合格</div>
        </div>
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="text-lg sm:text-2xl font-bold text-red-600">{statistics.todayFailCount}</div>
          <div className="text-xs sm:text-sm text-red-800">今日不合格</div>
        </div>
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="text-lg sm:text-2xl font-bold text-gray-600">{statistics.totalCount}</div>
          <div className="text-xs sm:text-sm text-gray-800">总计上传</div>
        </div>
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="text-lg sm:text-2xl font-bold text-green-600">{statistics.passCount}</div>
          <div className="text-xs sm:text-sm text-green-800">总计合格</div>
        </div>
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="text-lg sm:text-2xl font-bold text-red-600">{statistics.failCount}</div>
          <div className="text-xs sm:text-sm text-red-800">总计不合格</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange({ status: e.target.value as FilterOptions['status'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">全部状态</option>
              <option value="completed">已完成</option>
              <option value="processing">分析中</option>
              <option value="failed">失败</option>
              <option value="timeout">超时</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结果</label>
            <select
              value={filters.result || 'all'}
              onChange={(e) => handleFilterChange({ result: e.target.value as FilterOptions['result'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">全部结果</option>
              <option value="PASS">合格</option>
              <option value="FAIL">不合格</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table - Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  创建时间
                  {getSortIcon('created_at')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('barcode')}
              >
                <div className="flex items-center">
                  条形码
                  {getSortIcon('barcode')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  状态
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('result')}
              >
                <div className="flex items-center">
                  结果
                  {getSortIcon('result')}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">置信度</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">工位</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedJobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>暂无记录</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDateTime(job.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {job.barcode}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getStatusBadge(job.status)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getResultBadge(job.result)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {job.confidence ? `${(job.confidence * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {job.station || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-medium"
                      onClick={() => {
                        // This would typically open a modal or navigate to detail view
                        console.log('View details for job:', job.id);
                      }}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden space-y-3">
        {sortedJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 text-gray-300 mb-2 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>暂无记录</p>
          </div>
        ) : (
          sortedJobs.map((job) => (
            <div key={job.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="font-mono text-sm font-medium text-gray-900 mb-1 break-all">
                    {job.barcode}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(job.created_at)}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {getStatusBadge(job.status)}
                  {getResultBadge(job.result)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">置信度:</span>
                  <span className="ml-1 text-gray-900">
                    {job.confidence ? `${(job.confidence * 100).toFixed(1)}%` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">工位:</span>
                  <span className="ml-1 text-gray-900">{job.station || '-'}</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  onClick={() => {
                    console.log('View details for job:', job.id);
                  }}
                >
                  查看详情
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination could be added here if needed */}
      {sortedJobs.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          显示 {sortedJobs.length} 条记录
        </div>
      )}
    </div>
  );
}