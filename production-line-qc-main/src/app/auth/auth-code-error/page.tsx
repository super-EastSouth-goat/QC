export default function AuthCodeError() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">认证错误</h1>
        <p className="text-gray-600 mb-4">
          登录链接无效或已过期。
        </p>
        <p className="text-sm text-gray-500 mb-6">
          请返回登录页面重新尝试。
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          返回首页
        </a>
      </div>
    </div>
  )
}