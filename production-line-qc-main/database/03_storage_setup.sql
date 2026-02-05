-- Storage 存储桶配置
-- Storage Bucket Configuration

-- 创建存储桶（需要在 Supabase Dashboard 中执行或通过 API）
-- 这个脚本提供参考，实际创建需要在 Supabase 控制台中进行

-- 存储桶策略
CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'qc-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'qc-images' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('supervisor', 'engineer', 'admin')
      )
    )
  );

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'qc-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'qc-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );