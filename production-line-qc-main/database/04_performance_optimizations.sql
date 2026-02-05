-- 性能优化和扩展建议
-- Performance Optimizations and Extensions

-- 1. 添加复合索引以优化常见查询
CREATE INDEX CONCURRENTLY idx_jobs_user_status_created 
ON jobs(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_jobs_barcode_created 
ON jobs(barcode, created_at DESC);

CREATE INDEX CONCURRENTLY idx_photos_user_created 
ON photos(user_id, created_at DESC);

-- 2. 添加部分索引以优化特定状态查询
CREATE INDEX CONCURRENTLY idx_jobs_processing 
ON jobs(created_at DESC) WHERE status IN ('processing', 'uploading');

CREATE INDEX CONCURRENTLY idx_jobs_failed 
ON jobs(created_at DESC, detail) WHERE status IN ('failed', 'timeout');

-- 3. 添加统计视图以提高报表性能
CREATE OR REPLACE VIEW job_statistics AS
SELECT 
  user_id,
  DATE(created_at) as date,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN result = 'PASS' THEN 1 END) as pass_count,
  COUNT(CASE WHEN result = 'FAIL' THEN 1 END) as fail_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
  AVG(CASE WHEN confidence IS NOT NULL THEN confidence END) as avg_confidence,
  MIN(created_at) as first_job_time,
  MAX(created_at) as last_job_time
FROM jobs 
GROUP BY user_id, DATE(created_at);

-- 4. 添加工位统计视图
CREATE OR REPLACE VIEW station_statistics AS
SELECT 
  station,
  DATE(created_at) as date,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN result = 'PASS' THEN 1 END) as pass_count,
  COUNT(CASE WHEN result = 'FAIL' THEN 1 END) as fail_count,
  ROUND(AVG(CASE WHEN confidence IS NOT NULL THEN confidence END), 3) as avg_confidence
FROM jobs 
WHERE station IS NOT NULL
GROUP BY station, DATE(created_at);

-- 5. 添加实时统计函数
CREATE OR REPLACE FUNCTION get_user_daily_stats(target_user_id UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_jobs BIGINT,
  pass_count BIGINT,
  fail_count BIGINT,
  avg_confidence NUMERIC,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN result = 'PASS' THEN 1 END) as pass_count,
    COUNT(CASE WHEN result = 'FAIL' THEN 1 END) as fail_count,
    ROUND(AVG(CASE WHEN confidence IS NOT NULL THEN confidence END), 3) as avg_confidence,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(COUNT(CASE WHEN result = 'PASS' THEN 1 END) * 100.0 / COUNT(*), 2)
      ELSE 0 
    END as pass_rate
  FROM jobs 
  WHERE user_id = target_user_id 
    AND DATE(created_at) = target_date;
END;
$$ LANGUAGE plpgsql;

-- 6. 添加数据清理函数（可选）
CREATE OR REPLACE FUNCTION cleanup_old_job_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM job_events 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 添加数据完整性检查函数
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- 检查孤立的照片记录
  RETURN QUERY
  SELECT 
    'orphaned_photos'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' photos without corresponding jobs'::TEXT
  FROM photos p
  LEFT JOIN jobs j ON p.job_id = j.id
  WHERE j.id IS NULL;

  -- 检查没有照片的已完成任务
  RETURN QUERY
  SELECT 
    'completed_jobs_without_photos'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'INFO' END::TEXT,
    'Found ' || COUNT(*) || ' completed jobs without photos'::TEXT
  FROM jobs j
  LEFT JOIN photos p ON j.id = p.job_id
  WHERE j.status = 'completed' AND p.id IS NULL;

  -- 检查长时间处理中的任务
  RETURN QUERY
  SELECT 
    'long_processing_jobs'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' jobs processing for more than 1 hour'::TEXT
  FROM jobs
  WHERE status IN ('processing', 'uploading') 
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;