-- Set user as admin
-- 设置用户为管理员

-- Replace 'your-email@example.com' with the actual email address
-- 将 'your-email@example.com' 替换为实际的邮箱地址

-- Method 1: Set admin by email (if you know the email)
-- 方法1：通过邮箱设置管理员（如果你知道邮箱）
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'jenny.lai@clt-inc.tech'  -- 替换为你的邮箱
);

-- Method 2: Set admin by user ID (if you know the user ID)
-- 方法2：通过用户ID设置管理员（如果你知道用户ID）
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE id = 'your-user-id-here';

-- Verify the change
-- 验证更改
SELECT 
  p.id,
  u.email,
  p.role,
  p.station,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';

-- Show all users and their roles
-- 显示所有用户及其角色
SELECT 
  p.id,
  u.email,
  p.role,
  p.station,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;