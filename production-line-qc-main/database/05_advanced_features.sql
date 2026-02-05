-- 高级功能和扩展
-- Advanced Features and Extensions

-- 1. 添加质检批次表（用于批量质检）
CREATE TABLE qc_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  batch_name TEXT NOT NULL,
  description TEXT,
  station TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  pass_jobs INTEGER DEFAULT 0,
  fail_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 为批次表添加索引
CREATE INDEX idx_qc_batches_user_created ON qc_batches(user_id, created_at DESC);
CREATE INDEX idx_qc_batches_status ON qc_batches(status);

-- 为 jobs 表添加 batch_id 字段
ALTER TABLE jobs ADD COLUMN batch_id UUID REFERENCES qc_batches(id);
CREATE INDEX idx_jobs_batch_id ON jobs(batch_id);

-- 2. 添加质检模板表（用于标准化质检流程）
CREATE TABLE qc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  station TEXT,
  checklist JSONB, -- 质检项目清单
  pass_criteria JSONB, -- 通过标准
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_qc_templates_station ON qc_templates(station);
CREATE INDEX idx_qc_templates_active ON qc_templates(is_active);

-- 为 jobs 表添加 template_id 字段
ALTER TABLE jobs ADD COLUMN template_id UUID REFERENCES qc_templates(id);

-- 3. 添加质检标准表（用于AI模型配置）
CREATE TABLE qc_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_category TEXT,
  ai_model_config JSONB, -- AI模型配置
  confidence_threshold DECIMAL(3,2) DEFAULT 0.8,
  auto_pass_threshold DECIMAL(3,2) DEFAULT 0.95,
  auto_fail_threshold DECIMAL(3,2) DEFAULT 0.3,
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 jobs 表添加 standard_id 字段
ALTER TABLE jobs ADD COLUMN standard_id UUID REFERENCES qc_standards(id);

-- 4. 添加设备管理表
CREATE TABLE qc_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('camera', 'scanner', 'sensor')),
  station TEXT,
  ip_address INET,
  mac_address MACADDR,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_qc_devices_station ON qc_devices(station);
CREATE INDEX idx_qc_devices_status ON qc_devices(status);

-- 为 jobs 表添加 device_id 字段
ALTER TABLE jobs ADD COLUMN device_id UUID REFERENCES qc_devices(id);

-- 5. 添加质检报告表
CREATE TABLE qc_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
  title TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  filters JSONB, -- 报告筛选条件
  data JSONB, -- 报告数据
  generated_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_qc_reports_type_date ON qc_reports(report_type, date_from, date_to);
CREATE INDEX idx_qc_reports_generated_by ON qc_reports(generated_by);

-- 6. 添加系统配置表
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO system_config (key, value, description) VALUES
('ai_api_config', '{"url": "", "timeout": 30000, "max_retries": 2}', 'AI API 配置'),
('upload_config', '{"max_file_size": 10485760, "allowed_types": ["image/jpeg", "image/png", "image/webp"]}', '文件上传配置'),
('polling_config', '{"interval": 2000, "max_duration": 30000}', '状态轮询配置'),
('notification_config', '{"email_enabled": false, "sms_enabled": false}', '通知配置');

-- 7. 添加通知表
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- 8. 添加批次统计更新触发器
CREATE OR REPLACE FUNCTION update_batch_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- 更新批次统计
    UPDATE qc_batches SET
      total_jobs = (
        SELECT COUNT(*) FROM jobs WHERE batch_id = NEW.batch_id
      ),
      completed_jobs = (
        SELECT COUNT(*) FROM jobs WHERE batch_id = NEW.batch_id AND status = 'completed'
      ),
      pass_jobs = (
        SELECT COUNT(*) FROM jobs WHERE batch_id = NEW.batch_id AND result = 'PASS'
      ),
      fail_jobs = (
        SELECT COUNT(*) FROM jobs WHERE batch_id = NEW.batch_id AND result = 'FAIL'
      ),
      updated_at = NOW()
    WHERE id = NEW.batch_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_batch_stats_trigger
  AFTER INSERT OR UPDATE ON jobs
  FOR EACH ROW
  WHEN (NEW.batch_id IS NOT NULL)
  EXECUTE FUNCTION update_batch_statistics();

-- 9. 添加 RLS 策略（扩展表）
ALTER TABLE qc_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 批次表策略
CREATE POLICY "Users can view own batches" ON qc_batches
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'engineer', 'admin'))
  );

CREATE POLICY "Users can create own batches" ON qc_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches" ON qc_batches
  FOR UPDATE USING (auth.uid() = user_id);

-- 模板表策略
CREATE POLICY "All users can view active templates" ON qc_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Supervisors can manage templates" ON qc_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'engineer', 'admin'))
  );

-- 通知表策略
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);