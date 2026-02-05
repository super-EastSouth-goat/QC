'use client';

import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const { user, profile, session, loading, refreshProfile } = useAuth();
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [profileTest, setProfileTest] = useState<any>(null);

  useEffect(() => {
    const checkSupabase = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase.auth.getSession();
        setSupabaseStatus({ data, error });
        
        // 如果有用户，尝试直接查询 profile
        if (data.session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
          
          setProfileTest({ 
            profileData, 
            profileError,
            userId: data.session.user.id,
            userEmail: data.session.user.email
          });
        }
      } catch (err) {
        setSupabaseStatus({ error: err });
      }
    };
    
    checkSupabase();
  }, []);

  const handleClearAuth = () => {
    // 清除所有认证数据
    localStorage.clear();
    sessionStorage.clear();
    
    // 清除 cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    window.location.reload();
  };

  const handleForceLogout = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      handleClearAuth();
    } catch (error) {
      console.error('Force logout error:', error);
      handleClearAuth();
    }
  };

  const handleForceSetProfile = () => {
    if (user) {
      // 直接调用认证上下文的 refreshProfile
      refreshProfile();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">认证状态调试</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 认证上下文状态 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">认证上下文状态</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
              <div><strong>User:</strong> {user ? user.email : 'null'}</div>
              <div><strong>Profile:</strong> {profile ? profile.role : 'null'}</div>
              <div><strong>Session:</strong> {session ? 'exists' : 'null'}</div>
            </div>
          </div>

          {/* Profile 测试结果 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Profile 查询测试</h2>
            <div className="text-sm">
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(profileTest, null, 2)}
              </pre>
            </div>
          </div>

          {/* 环境变量 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">环境配置</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
              <div><strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置' : '未配置'}</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">操作</h2>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                刷新页面
              </button>
              <button
                onClick={handleForceSetProfile}
                className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700"
              >
                强制设置 Profile
              </button>
              <button
                onClick={handleClearAuth}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                清除所有认证数据
              </button>
              <button
                onClick={handleForceLogout}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700"
              >
                强制登出
              </button>
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                跳转到登录页
              </button>
              <button
                onClick={() => window.location.href = '/simple-logout'}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
              >
                使用简单登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}