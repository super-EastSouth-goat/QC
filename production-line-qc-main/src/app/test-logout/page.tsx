'use client';

import { useAuth } from '@/lib/auth/context';

export default function TestLogoutPage() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      console.log('Starting logout...');
      await signOut();
      console.log('Logout completed');
      
      // 强制跳转
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      // 即使出错也跳转
      window.location.href = '/auth/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">登出测试页面</h1>
          
          {user ? (
            <div className="space-y-4">
              <p className="text-gray-600">当前用户: {user.email}</p>
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                登出
              </button>
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                直接跳转到登录页
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">未登录状态</p>
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                前往登录页
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}