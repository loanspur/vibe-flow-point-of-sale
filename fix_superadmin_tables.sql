-- Fix SuperAdmin Dashboard Missing Tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- PAYMENT_HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_provider VARCHAR(50),
    provider_transaction_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_history
CREATE POLICY "Superadmins can view all payments" ON public.payment_history FOR SELECT USING (true);
CREATE POLICY "Superadmins can insert payments" ON public.payment_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Superadmins can update payments" ON public.payment_history FOR UPDATE USING (true);
CREATE POLICY "Superadmins can delete payments" ON public.payment_history FOR DELETE USING (true);

-- ============================================================================
-- USER_ACTIVITY_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user_activity_logs
CREATE POLICY "Superadmins can view all activity logs" ON public.user_activity_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert their own activity logs" ON public.user_activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Superadmins can update activity logs" ON public.user_activity_logs FOR UPDATE USING (true);
CREATE POLICY "Superadmins can delete activity logs" ON public.user_activity_logs FOR DELETE USING (true);

-- ============================================================================
-- GET_CURRENT_APPLICATION_VERSION RPC FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_application_version()
RETURNS TABLE(version TEXT, is_stable BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    '1.0.0'::TEXT as version,
    true::BOOLEAN as is_stable;
END;
$$;

-- ============================================================================
-- ADD MISSING COLUMNS TO TENANT_USERS
-- ============================================================================
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================================
-- CREATE SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample payment history
INSERT INTO public.payment_history (tenant_id, amount, payment_status, paid_at, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 99.99, 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', 149.99, 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001', 199.99, 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert sample activity logs
INSERT INTO public.user_activity_logs (tenant_id, user_id, action_type, details, created_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::UUID,
  u.id,
  'login',
  '{"source": "web"}'::JSONB,
  NOW() - (random() * INTERVAL '7 days')
FROM auth.users u
LIMIT 5
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_history_tenant_id ON public.payment_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_history_paid_at ON public.payment_history(paid_at);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_tenant_id ON public.user_activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action_type ON public.user_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at);

-- ============================================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON public.payment_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
