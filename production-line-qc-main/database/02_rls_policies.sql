-- Row Level Security 策略配置
-- Row Level Security Policies Configuration

-- 启用RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;

-- Profiles表策略
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs表策略
CREATE POLICY "Workers can view own jobs" ON jobs
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'engineer', 'admin')
    )
  );

CREATE POLICY "Workers can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers can update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Photos表策略
CREATE POLICY "Users can view related photos" ON photos
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('supervisor', 'engineer', 'admin')
    )
  );

CREATE POLICY "Users can insert own photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Job Events表策略
CREATE POLICY "Users can view related events" ON job_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_events.job_id 
      AND (jobs.user_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM profiles 
             WHERE id = auth.uid() 
             AND role IN ('supervisor', 'engineer', 'admin')
           ))
    )
  );

CREATE POLICY "System can insert events" ON job_events
  FOR INSERT WITH CHECK (true);