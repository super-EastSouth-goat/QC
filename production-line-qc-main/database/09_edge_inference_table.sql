-- Edge Inference Records Table
-- Stores results from edge machine inference API calls

CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic info
    barcode TEXT NOT NULL,
    edge_request_id TEXT NOT NULL,
    
    -- Edge API details
    edge_url TEXT NOT NULL,
    model_version TEXT,
    
    -- Inference results
    suggested_decision TEXT CHECK (suggested_decision IN ('PASS', 'FAIL', 'UNKNOWN')),
    raw_detections JSONB,
    inference_time_ms INTEGER,
    img_shape JSONB, -- {width: number, height: number}
    
    -- Image storage
    image_url TEXT, -- Supabase Storage URL or external URL
    image_size INTEGER, -- File size in bytes
    
    -- User and session info
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Status tracking
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspections_barcode ON public.inspections(barcode);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_edge_request_id ON public.inspections(edge_request_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);

-- RLS Policies
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Users can view their own inspections
CREATE POLICY "Users can view own inspections" ON public.inspections
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own inspections
CREATE POLICY "Users can insert own inspections" ON public.inspections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own inspections
CREATE POLICY "Users can update own inspections" ON public.inspections
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins and supervisors can view all inspections
CREATE POLICY "Admins can view all inspections" ON public.inspections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor', 'engineer')
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_inspections_updated_at ON public.inspections;
CREATE TRIGGER trigger_update_inspections_updated_at
    BEFORE UPDATE ON public.inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_inspections_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.inspections TO authenticated;
GRANT USAGE ON SEQUENCE inspections_id_seq TO authenticated;

-- Comments
COMMENT ON TABLE public.inspections IS 'Stores edge machine inference results and quality inspection records';
COMMENT ON COLUMN public.inspections.barcode IS 'Product barcode or identifier';
COMMENT ON COLUMN public.inspections.edge_request_id IS 'Unique request ID sent to edge API';
COMMENT ON COLUMN public.inspections.edge_url IS 'Base URL of the edge API that processed this request';
COMMENT ON COLUMN public.inspections.raw_detections IS 'Raw detection results from YOLO model in JSON format';
COMMENT ON COLUMN public.inspections.suggested_decision IS 'AI suggested quality decision (PASS/FAIL/UNKNOWN)';
COMMENT ON COLUMN public.inspections.inference_time_ms IS 'Time taken for inference in milliseconds';