-- Phase 3: Tenant UX and Feature Flags System
-- This migration creates the infrastructure for tenant-level UI customization and feature flags

-- Create tenant_customization table for UI branding and templates
CREATE TABLE IF NOT EXISTS public.tenant_customization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#2563eb', -- hex color
  secondary_color VARCHAR(7) DEFAULT '#64748b',
  accent_color VARCHAR(7) DEFAULT '#f59e0b',
  
  -- Receipt/Invoice Templates
  receipt_template TEXT DEFAULT 'Thank you for your purchase!',
  invoice_template TEXT DEFAULT 'Please pay within 30 days.',
  footer_text TEXT DEFAULT 'Powered by Vibe POS',
  
  -- UI Preferences
  show_stock_alerts BOOLEAN DEFAULT true,
  show_low_stock_warnings BOOLEAN DEFAULT true,
  default_currency VARCHAR(3) DEFAULT 'KES',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(10) DEFAULT '24h',
  
  -- Receipt Settings
  receipt_header TEXT,
  receipt_footer TEXT,
  include_tax_breakdown BOOLEAN DEFAULT true,
  include_payment_method BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);

-- Create feature_flags table for tenant-level feature gating
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, feature_name)
);

-- Create subscription_alerts table for trial/renewal notifications
CREATE TABLE IF NOT EXISTS public.subscription_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('trial_ending', 'trial_ended', 'renewal_due', 'payment_failed', 'subscription_expired')),
  alert_date DATE NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  notification_method VARCHAR(20) DEFAULT 'email' CHECK (notification_method IN ('email', 'whatsapp', 'sms')),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  message_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_customization_tenant ON public.tenant_customization(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON public.feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(tenant_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_subscription_alerts_tenant ON public.subscription_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_alerts_date ON public.subscription_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_subscription_alerts_pending ON public.subscription_alerts(tenant_id, is_sent) WHERE is_sent = false;

-- Add RLS policies
ALTER TABLE public.tenant_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_alerts ENABLE ROW LEVEL SECURITY;

-- Tenant customization policies
CREATE POLICY "Tenant users can view their customization" ON public.tenant_customization
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Tenant users can manage their customization" ON public.tenant_customization
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Superadmins can manage all customizations" ON public.tenant_customization
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- Feature flags policies
CREATE POLICY "Tenant users can view their feature flags" ON public.feature_flags
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Tenant users can manage their feature flags" ON public.feature_flags
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Superadmins can manage all feature flags" ON public.feature_flags
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- Subscription alerts policies
CREATE POLICY "Tenant users can view their subscription alerts" ON public.subscription_alerts
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Tenant users can manage their subscription alerts" ON public.subscription_alerts
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Superadmins can manage all subscription alerts" ON public.subscription_alerts
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- Add updated_at triggers
CREATE TRIGGER tenant_customization_updated_at
  BEFORE UPDATE ON public.tenant_customization
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER subscription_alerts_updated_at
  BEFORE UPDATE ON public.subscription_alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create RPC function to get tenant customization
CREATE OR REPLACE FUNCTION public.get_tenant_customization(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  logo_url TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  receipt_template TEXT,
  invoice_template TEXT,
  footer_text TEXT,
  show_stock_alerts BOOLEAN,
  show_low_stock_warnings BOOLEAN,
  default_currency VARCHAR(3),
  date_format VARCHAR(20),
  time_format VARCHAR(10),
  receipt_header TEXT,
  receipt_footer TEXT,
  include_tax_breakdown BOOLEAN,
  include_payment_method BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.tenant_id,
    tc.logo_url,
    tc.primary_color,
    tc.secondary_color,
    tc.accent_color,
    tc.receipt_template,
    tc.invoice_template,
    tc.footer_text,
    tc.show_stock_alerts,
    tc.show_low_stock_warnings,
    tc.default_currency,
    tc.date_format,
    tc.time_format,
    tc.receipt_header,
    tc.receipt_footer,
    tc.include_tax_breakdown,
    tc.include_payment_method,
    tc.created_at,
    tc.updated_at
  FROM public.tenant_customization tc
  WHERE tc.tenant_id = COALESCE(p_tenant_id, auth.jwt() ->> 'tenant_id'::text::uuid)
    AND (auth.jwt() ->> 'role' = 'superadmin' OR tc.tenant_id = auth.jwt() ->> 'tenant_id'::text::uuid);
END;
$$;

-- Create RPC function to check if a feature is enabled
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_feature_name VARCHAR(100), p_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT is_enabled INTO v_enabled
  FROM public.feature_flags
  WHERE tenant_id = COALESCE(p_tenant_id, auth.jwt() ->> 'tenant_id'::text::uuid)
    AND feature_name = p_feature_name
    AND (auth.jwt() ->> 'role' = 'superadmin' OR tenant_id = auth.jwt() ->> 'tenant_id'::text::uuid);
  
  RETURN COALESCE(v_enabled, false);
END;
$$;

-- Create RPC function to get all enabled features for a tenant
CREATE OR REPLACE FUNCTION public.get_enabled_features(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(feature_name VARCHAR(100), config JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ff.feature_name, ff.config
  FROM public.feature_flags ff
  WHERE ff.tenant_id = COALESCE(p_tenant_id, auth.jwt() ->> 'tenant_id'::text::uuid)
    AND ff.is_enabled = true
    AND (auth.jwt() ->> 'role' = 'superadmin' OR ff.tenant_id = auth.jwt() ->> 'tenant_id'::text::uuid);
END;
$$;

-- Create RPC function to create subscription alerts
CREATE OR REPLACE FUNCTION public.create_subscription_alert(
  p_tenant_id UUID,
  p_alert_type VARCHAR(50),
  p_alert_date DATE,
  p_notification_method VARCHAR(20) DEFAULT 'email',
  p_recipient_email VARCHAR(255) DEFAULT NULL,
  p_recipient_phone VARCHAR(20) DEFAULT NULL,
  p_message_content TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO public.subscription_alerts (
    tenant_id,
    alert_type,
    alert_date,
    notification_method,
    recipient_email,
    recipient_phone,
    message_content
  ) VALUES (
    p_tenant_id,
    p_alert_type,
    p_alert_date,
    p_notification_method,
    p_recipient_email,
    p_recipient_phone,
    p_message_content
  ) RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Create RPC function to get pending subscription alerts
CREATE OR REPLACE FUNCTION public.get_pending_subscription_alerts(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  alert_type VARCHAR(50),
  alert_date DATE,
  notification_method VARCHAR(20),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  message_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.tenant_id,
    sa.alert_type,
    sa.alert_date,
    sa.notification_method,
    sa.recipient_email,
    sa.recipient_phone,
    sa.message_content,
    sa.created_at
  FROM public.subscription_alerts sa
  WHERE sa.is_sent = false
    AND sa.alert_date <= CURRENT_DATE
    AND (auth.jwt() ->> 'role' = 'superadmin' OR sa.tenant_id = auth.jwt() ->> 'tenant_id'::text::uuid)
  ORDER BY sa.alert_date ASC, sa.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Create RPC function to mark subscription alert as sent
CREATE OR REPLACE FUNCTION public.mark_subscription_alert_sent(p_alert_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscription_alerts
  SET is_sent = true, sent_at = NOW()
  WHERE id = p_alert_id
    AND (auth.jwt() ->> 'role' = 'superadmin' OR tenant_id = auth.jwt() ->> 'tenant_id'::text::uuid);
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tenant_customization TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_enabled_features TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_subscription_alert TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_subscription_alerts TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_subscription_alert_sent TO service_role;

-- Insert default customization for existing tenants
INSERT INTO public.tenant_customization (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert default feature flags for existing tenants
INSERT INTO public.feature_flags (tenant_id, feature_name, is_enabled, config)
SELECT 
  t.id,
  'ecommerce'::VARCHAR(100),
  false,
  '{"enabled": false, "storefront_url": null}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, feature_name) DO NOTHING;

INSERT INTO public.feature_flags (tenant_id, feature_name, is_enabled, config)
SELECT 
  t.id,
  'advanced_analytics'::VARCHAR(100),
  false,
  '{"enabled": false, "ai_insights": false}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, feature_name) DO NOTHING;

INSERT INTO public.feature_flags (tenant_id, feature_name, is_enabled, config)
SELECT 
  t.id,
  'multi_location'::VARCHAR(100),
  true,
  '{"enabled": true, "max_locations": 5}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, feature_name) DO NOTHING;

-- Create a cron job to process subscription alerts daily using the Edge Function
DO $$
BEGIN
  -- Unschedule existing job if it exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-subscription-alerts') THEN
    PERFORM cron.unschedule('process-subscription-alerts');
  END IF;
  
  -- Schedule new job to call the Edge Function
  PERFORM cron.schedule(
    'process-subscription-alerts',
    '0 9 * * *', -- Daily at 9 AM UTC
    $$
    SELECT net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/process-subscription-alerts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}',
      body := '{}'
    );
    $$
  );
END $$;
