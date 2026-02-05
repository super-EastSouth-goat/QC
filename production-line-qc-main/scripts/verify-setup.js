#!/usr/bin/env node

/**
 * 验证开发环境设置
 * Verify development environment setup
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 验证产线拍照质检系统开发环境设置...')
console.log('🔍 Verifying Production Line QC System setup...\n')

const checks = [
  {
    name: '检查 package.json',
    check: () => fs.existsSync('package.json'),
    message: 'package.json 存在'
  },
  {
    name: '检查 TypeScript 配置',
    check: () => fs.existsSync('tsconfig.json'),
    message: 'tsconfig.json 存在'
  },
  {
    name: '检查 Next.js 配置',
    check: () => fs.existsSync('next.config.ts'),
    message: 'next.config.ts 存在'
  },
  {
    name: '检查 Tailwind 配置',
    check: () => fs.existsSync('postcss.config.mjs'),
    message: 'PostCSS/Tailwind 配置存在'
  },
  {
    name: '检查环境变量模板',
    check: () => fs.existsSync('.env.local.example'),
    message: '.env.local.example 存在'
  },
  {
    name: '检查 Supabase 客户端配置',
    check: () => fs.existsSync('src/lib/supabase/client.ts'),
    message: 'Supabase 客户端配置存在'
  },
  {
    name: '检查数据库类型定义',
    check: () => fs.existsSync('src/lib/types/database.ts'),
    message: '数据库类型定义存在'
  },
  {
    name: '检查数据库迁移脚本',
    check: () => fs.existsSync('database/01_initial_schema.sql'),
    message: '数据库迁移脚本存在'
  },
  {
    name: '检查 Jest 配置',
    check: () => fs.existsSync('jest.config.js'),
    message: 'Jest 配置存在'
  },
  {
    name: '检查 node_modules',
    check: () => fs.existsSync('node_modules'),
    message: '依赖已安装'
  }
]

let allPassed = true

checks.forEach(({ name, check, message }) => {
  const passed = check()
  const status = passed ? '✅' : '❌'
  console.log(`${status} ${name}: ${passed ? message : '缺失'}`)
  if (!passed) allPassed = false
})

console.log('\n' + '='.repeat(50))

if (allPassed) {
  console.log('🎉 所有检查通过！开发环境设置完成。')
  console.log('🎉 All checks passed! Development environment is ready.')
  console.log('\n📝 下一步：')
  console.log('📝 Next steps:')
  console.log('1. 配置 .env.local 文件中的 Supabase 连接信息')
  console.log('2. 在 Supabase 中执行数据库迁移脚本')
  console.log('3. 运行 npm run dev 启动开发服务器')
  process.exit(0)
} else {
  console.log('❌ 部分检查失败，请检查项目设置。')
  console.log('❌ Some checks failed, please verify project setup.')
  process.exit(1)
}