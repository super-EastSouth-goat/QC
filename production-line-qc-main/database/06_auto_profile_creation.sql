-- 自动创建用户 Profile 的触发器
-- Auto Profile Creation Trigger

-- 创建处理新用户的函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, station)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      'worker'
    ),
    NEW.raw_user_meta_data->>'station'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，当新用户注册时自动创建 profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 为现有用户创建 profile（如果不存在）
INSERT INTO public.profiles (id, role, station)
SELECT 
  au.id,
  'worker',
  NULL
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;