#!/usr/bin/env node

/**
 * 验证数据库设置
 * Verify database setup
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

async function verifyDatabase() {
  console.log(colors.cyan('🔍 产线拍照质检系统 - 数据库设置验证\n'));

  // 检查环境变量
  console.log(colors.blue('1. 检查环境变量配置...'));
  
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log(colors.red('❌ .env.local 文件不存在'));
    console.log(colors.yellow('请创建 .env.local 文件并配置 Supabase 信息'));
    console.log(colors.yellow('参考 .env.local.example 文件'));
    return false;
  }

  // 读取环境变量
  const envContent = fs.readFileSync(envPath, 'utf8');
  const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
  const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
  const supabaseServiceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
    console.log(colors.red('❌ NEXT_PUBLIC_SUPABASE_URL 未配置'));
    console.log(colors.yellow('请在 .env.local 中设置正确的 Supabase URL'));
    console.log(colors.yellow('格式: https://your-project-ref.supabase.co'));
    return false;
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
    console.log(colors.red('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置'));
    console.log(colors.yellow('请在 .env.local 中设置正确的 Supabase Anon Key'));
    return false;
  }

  console.log(colors.green('✅ 环境变量配置正确'));
  console.log(`   URL: ${supabaseUrl}`);

  // 测试 Supabase 连接
  console.log(colors.blue('\n2. 测试 Supabase 连接...'));
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 测试基本连接
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log(colors.red('❌ 数据库表 "profiles" 不存在'));
      console.log(colors.yellow('请按照以下步骤执行数据库脚本：'));
      console.log(colors.yellow('1. 打开 Supabase Dashboard → SQL Editor'));
      console.log(colors.yellow('2. 执行 database/01_initial_schema.sql'));
      console.log(colors.yellow('3. 执行 database/02_rls_policies.sql'));
      console.log(colors.yellow('4. 执行 database/03_storage_setup.sql'));
      return false;
    } else if (error) {
      console.log(colors.red(`❌ 数据库连接错误: ${error.message}`));
      console.log(colors.yellow('请检查 Supabase URL 和 API Key 是否正确'));
      return false;
    }
    
    console.log(colors.green('✅ Supabase 连接成功'));
  } catch (err) {
    console.log(colors.red(`❌ 连接失败: ${err.message}`));
    console.log(colors.yellow('请检查网络连接和 Supabase 配置'));
    return false;
  }

  // 检查数据库表
  console.log(colors.blue('\n3. 检查数据库表结构...'));
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const requiredTables = ['profiles', 'jobs', 'photos', 'job_events'];
    const tableChecks = [];
    
    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error && error.code === 'PGRST116') {
          tableChecks.push({ table, exists: false });
        } else {
          tableChecks.push({ table, exists: true });
        }
      } catch (err) {
        tableChecks.push({ table, exists: false });
      }
    }
    
    const missingTables = tableChecks.filter(t => !t.exists);
    
    if (missingTables.length > 0) {
      console.log(colors.red(`❌ 缺少数据库表: ${missingTables.map(t => t.table).join(', ')}`));
      console.log(colors.yellow('请在 Supabase SQL Editor 中执行以下脚本：'));
      console.log(colors.yellow('1. database/01_initial_schema.sql'));
      console.log(colors.yellow('2. database/02_rls_policies.sql'));
      return false;
    }
    
    console.log(colors.green('✅ 所有必需的数据库表都存在'));
    tableChecks.forEach(t => {
      console.log(`   ✓ ${t.table}`);
    });
  } catch (err) {
    console.log(colors.red(`❌ 表检查失败: ${err.message}`));
    return false;
  }

  // 检查存储桶
  console.log(colors.blue('\n4. 检查存储桶配置...'));
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log(colors.yellow(`⚠️  无法检查存储桶: ${error.message}`));
      console.log(colors.yellow('请确保在 Supabase Dashboard 中创建了 "qc-images" 存储桶'));
    } else {
      const qcImagesBucket = buckets.find(b => b.name === 'qc-images');
      
      if (!qcImagesBucket) {
        console.log(colors.red('❌ qc-images 存储桶不存在'));
        console.log(colors.yellow('请在 Supabase Dashboard → Storage 中创建 "qc-images" 存储桶'));
        console.log(colors.yellow('设置为私有存储桶，文件大小限制 10MB'));
        return false;
      } else {
        console.log(colors.green('✅ qc-images 存储桶配置正确'));
      }
    }
  } catch (err) {
    console.log(colors.yellow(`⚠️  存储桶检查跳过: ${err.message}`));
  }

  // 检查应用模式
  console.log(colors.blue('\n5. 检查应用运行模式...'));
  
  if (supabaseUrl.includes('demo.supabase.co') || supabaseAnonKey === 'demo-anon-key') {
    console.log(colors.yellow('⚠️  应用仍在 Demo 模式运行'));
    console.log(colors.yellow('请配置真实的 Supabase 项目信息'));
    return false;
  } else {
    console.log(colors.green('✅ 应用配置为生产模式'));
  }

  return true;
}

// 运行验证
async function main() {
  const success = await verifyDatabase();
  
  if (success) {
    console.log(colors.cyan('\n🎉 数据库设置验证完成！'));
    console.log(colors.green('✅ 系统已准备就绪，可以开始使用质检功能'));
    console.log(colors.blue('\n📖 下一步：'));
    console.log('   1. 启动开发服务器: npm run dev');
    console.log('   2. 访问: http://localhost:3000');
    console.log('   3. 现在应该看到真实的登录界面，而不是 Demo 模式');
    console.log('   4. 配置 OIDC 企业登录（可选）');
    process.exit(0);
  } else {
    console.log(colors.red('\n❌ 数据库设置验证失败'));
    console.log(colors.yellow('请按照上述提示完成配置，然后重新运行此脚本'));
    console.log(colors.blue('\n📖 详细设置指南：'));
    console.log('   查看 docs/DATABASE_SETUP_GUIDE.md');
    process.exit(1);
  }
}

main().catch(console.error);