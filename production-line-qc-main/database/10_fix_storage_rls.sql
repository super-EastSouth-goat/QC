-- Fix Storage RLS Policies
-- 修复 Storage RLS 策略

-- First, let's check if the qc-images bucket exists
-- 首先检查 qc-images 存储桶是否存在
-- (This needs to be done in Supabase Dashboard if not exists)

-- Drop existing storage policies if they exist
-- 删除现有的存储策略（如果存在）
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Create new storage policies for authenticated users
-- 为认证用户创建新的存储策略

-- Policy 1: Users can upload images to their own folder
-- 策略1：用户可以上传图片到自己的文件夹
CREATE POLICY "Authenticated users can upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qc-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 2: Users can view their own images + admins can view all
-- 策略2：用户可以查看自己的图片 + 管理员可以查看所有
CREATE POLICY "Users can view own images or admins view all" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'qc-images' AND (
      -- User can view their own files
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Or user is admin/supervisor/engineer
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'supervisor', 'engineer')
      )
    )
  );

-- Policy 3: Users can update their own images
-- 策略3：用户可以更新自己的图片
CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qc-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 4: Users can delete their own images + admins can delete all
-- 策略4：用户可以删除自己的图片 + 管理员可以删除所有
CREATE POLICY "Users can delete own images or admins delete all" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'qc-images' AND (
      -- User can delete their own files
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Or user is admin/supervisor/engineer
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'supervisor', 'engineer')
      )
    )
  );

-- Enable RLS on storage.objects if not already enabled
-- 如果尚未启用，则在 storage.objects 上启用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Note: You also need to ensure the qc-images bucket exists
-- 注意：你还需要确保 qc-images 存储桶存在
-- This must be done in Supabase Dashboard:
-- 这必须在 Supabase Dashboard 中完成：
-- 1. Go to Storage
-- 2. Create new bucket named 'qc-images'
-- 3. Set it as Public bucket
-- 4. Run this SQL script

-- Verification queries (run these to check if policies are working)
-- 验证查询（运行这些来检查策略是否有效）

-- Check if policies exist:
-- 检查策略是否存在：
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check current user and their role:
-- 检查当前用户及其角色：
-- SELECT auth.uid() as user_id, p.role 
-- FROM profiles p 
-- WHERE p.id = auth.uid();