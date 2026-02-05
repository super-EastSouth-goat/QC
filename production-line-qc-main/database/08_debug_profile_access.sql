-- 调试 Profile 访问问题
-- Debug Profile Access Issues

-- 1. 检查当前用户和 profile 数据
SELECT 
  'Users' as table_name,
  count(*) as count
FROM auth.users;

SELECT 
  'Profiles' as table_name,
  count(*) as count
FROM public.profiles;

-- 2. 检查具体的用户和 profile 匹配
SELECT 
  au.id,
  au.email,
  au.created_at as user_created,
  p.id as profile_id,
  p.role,
  p.station,
  p.created_at as profile_created
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email LIKE '%jenny.lai%'
ORDER BY au.created_at DESC;

-- 3. 检查 RLS 策略是否阻止访问
-- 临时禁用 RLS 来测试
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 再次查询 profiles
SELECT * FROM public.profiles LIMIT 5;

-- 重新启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. 检查当前认证用户
SELECT auth.uid() as current_user_id;

-- 5. 测试 RLS 策略
SELECT 
  p.*,
  auth.uid() as current_auth_uid,
  (auth.uid() = p.id) as uid_matches
FROM public.profiles p
WHERE p.id = auth.uid();

-- 6. 如果还是没有数据，强制插入一条记录
INSERT INTO public.profiles (id, role, station)
SELECT 
  au.id,
  'worker',
  '测试工位'
FROM auth.users au
WHERE au.email LIKE '%jenny.lai%'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  station = EXCLUDED.station,
  updated_at = NOW();

-- 7. 最终验证
SELECT 
  au.email,
  p.role,
  p.station,
  p.created_at
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
WHERE au.email LIKE '%jenny.lai%';