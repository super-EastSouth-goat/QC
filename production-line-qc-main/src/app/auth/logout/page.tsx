'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';

export default function LogoutPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        console.log('Performing logout...');
        
        // 执行登出
        await signOut();
        
        console.log('Logout completed, redirecting to login...');
        
        // 使用 window.location 强制跳转
        window.location.href = '/auth/login';
        
      } catch (err) {
        console.error('Logout error:', err);
        // 即使出错也跳转到登录页
        window.location.href = '/auth/login';
      }
    };

    performLogout();
  }, [signOut]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">正在登出</h1>
          <p className="text-gray-600 mb-4">正在安全登出，请稍候...</p>
          
          {/* 备用跳转按钮 */}
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            立即跳转到登录页
          </button>
        </div>
      </div>
    </div>
  );
}