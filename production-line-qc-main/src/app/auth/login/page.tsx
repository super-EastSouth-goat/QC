'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useUser } from '@/lib/auth/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render login form if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            产线拍照质检系统
          </h1>
          <p className="text-gray-600">
            请登录以访问质检系统
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <LoginForm 
            onSuccess={() => router.push('/')}
            className="w-full"
          />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              首次使用？系统将自动为您创建账户
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          © 2024 产线拍照质检系统. 保留所有权利.
        </p>
      </div>
    </div>
  );
}