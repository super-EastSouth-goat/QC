-- 修复用户 Profile 问题
-- Fix User Profile Issues

-- 首先检查当前用户
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
ORDER BY au.created_at DESC;

-- 为没有 profile 的用户创建 profile
INSERT INTO public.profiles (id, role, station)
SELECT 
  au.id,
  'worker',
  NULL
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 验证结果
SELECT 
  au.id,
  au.email,
  p.role,
  p.station
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;