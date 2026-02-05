'use client';

import { useEffect } from 'react';

export default function SimpleLogoutPage() {
  useEffect(() => {
    // 清除所有可能的认证数据
    localStorage.clear();
    sessionStorage.clear();
    
    // 清除所有 cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    console.log('All auth data cleared');
    
    // 延迟跳转，确保清理完成
    setTimeout(() => {
      window.location.replace('/auth/login');
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">正在登出</h1>
          <p className="text-gray-600 mb-4">正在清理登录信息...</p>
          
          <div className="mt-6 space-y-2">
            <button
              onClick={() => window.location.replace('/auth/login')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              立即跳转到登录页
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}