'use client';

export default function DemoInfoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900">
              演示模式说明
            </h1>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              <strong>当前运行在演示模式下</strong> - 系统检测到 Supabase 未配置，自动启用了演示模式。
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">演示模式功能</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-medium text-gray-900">模拟用户认证</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    自动登录为演示用户，角色为"产线工人"，工位为"工位A"
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-medium text-gray-900">质检流程模拟</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    完整的扫码→拍照→分析→结果流程，使用模拟数据
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-medium text-gray-900">历史记录展示</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    生成15条模拟历史记录，包含各种状态和结果
                  </p>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-medium text-gray-900">AI分析模拟</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    模拟边缘API调用，随机生成PASS/FAIL结果和置信度
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">如何配置真实环境</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>创建 Supabase 项目：访问 <a href="https://supabase.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a></li>
                  <li>获取项目 URL 和 API 密钥</li>
                  <li>运行数据库迁移脚本（在 <code className="bg-gray-200 px-1 rounded">database/</code> 目录中）</li>
                  <li>更新 <code className="bg-gray-200 px-1 rounded">.env.local</code> 文件中的环境变量：</li>
                </ol>
                
                <div className="mt-4 bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm">
                  <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                  <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</div>
                  <div>SUPABASE_SERVICE_ROLE_KEY=your-service-role-key</div>
                  <div>EDGE_API_URL=https://your-edge-api.com/api</div>
                </div>
                
                <p className="mt-4 text-sm text-gray-600">
                  配置完成后重启开发服务器，系统将自动切换到生产模式。
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">演示模式限制</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                  <li>数据不会持久化保存</li>
                  <li>无法进行真实的用户认证</li>
                  <li>照片上传仅在浏览器会话中有效</li>
                  <li>无法连接真实的边缘计算API</li>
                  <li>刷新页面后数据会重置</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <a
              href="/"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回首页
            </a>
            <a
              href="/"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              体验质检流程
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}