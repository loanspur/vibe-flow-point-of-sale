-- Create notification templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('whatsapp', 'email', 'sms')),
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- Create notification settings table for per-tenant configuration
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('whatsapp', 'email', 'sms')),
  is_enabled BOOLEAN DEFAULT true,
  provider_config JSONB DEFAULT '{}'::jsonb,
  rate_limit_per_hour INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, notification_type)
);

-- Create notification queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('whatsapp', 'email', 'sms')),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  provider_response JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON public.notification_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant ON public.notification_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_tenant ON public.notification_queue(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON public.notification_queue(recipient);

-- Add RLS policies
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Tenant users can manage their notification templates" ON public.notification_templates
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Superadmins can manage all notification templates" ON public.notification_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- Settings policies
CREATE POLICY "Tenant users can manage their notification settings" ON public.notification_settings
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Superadmins can manage all notification settings" ON public.notification_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- Queue policies
CREATE POLICY "Tenant users can view their notification queue" ON public.notification_queue
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "System can manage notification queue" ON public.notification_queue
  FOR ALL USING (true);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER notification_queue_updated_at
  BEFORE UPDATE ON public.notification_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to queue notifications
CREATE OR REPLACE FUNCTION public.queue_notification(
  p_template_name VARCHAR(255),
  p_recipient VARCHAR(255),
  p_variables JSONB DEFAULT '{}'::jsonb,
  p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
  v_template_record RECORD;
  v_tenant_id UUID;
  v_notification_id UUID;
  v_processed_content TEXT;
  v_processed_subject TEXT;
BEGIN
  -- Get current tenant context
  v_tenant_id := auth.jwt() ->> 'tenant_id'::text;
  
  -- Get template
  SELECT * INTO v_template_record
  FROM public.notification_templates
  WHERE tenant_id = v_tenant_id::UUID
    AND name = p_template_name
    AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_name;
  END IF;
  
  v_template_id := v_template_record.id;
  
  -- Process template variables
  v_processed_content := v_template_record.content;
  v_processed_subject := COALESCE(v_template_record.subject, '');
  
  -- Simple variable replacement (you might want to use a more sophisticated templating engine)
  FOR i IN 0..jsonb_array_length(p_variables) - 1 LOOP
    DECLARE
      v_key TEXT;
      v_value TEXT;
    BEGIN
      v_key := jsonb_object_keys(p_variables)[i + 1];
      v_value := p_variables->>v_key;
      
      v_processed_content := replace(v_processed_content, '{{' || v_key || '}}', v_value);
      v_processed_subject := replace(v_processed_subject, '{{' || v_key || '}}', v_value);
    END;
  END LOOP;
  
  -- Insert into queue
  INSERT INTO public.notification_queue (
    tenant_id,
    template_id,
    notification_type,
    recipient,
    subject,
    content,
    variables,
    scheduled_at
  ) VALUES (
    v_tenant_id::UUID,
    v_template_id,
    v_template_record.type,
    p_recipient,
    v_processed_subject,
    v_processed_content,
    p_variables,
    p_scheduled_at
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create function to get pending notifications for processing
CREATE OR REPLACE FUNCTION public.get_pending_notifications(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  template_id UUID,
  notification_type VARCHAR(50),
  recipient VARCHAR(255),
  subject VARCHAR(255),
  content TEXT,
  variables JSONB,
  retry_count INTEGER,
  max_retries INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nq.id,
    nq.tenant_id,
    nq.template_id,
    nq.notification_type,
    nq.recipient,
    nq.subject,
    nq.content,
    nq.variables,
    nq.retry_count,
    nq.max_retries,
    nq.scheduled_at
  FROM public.notification_queue nq
  WHERE nq.status = 'pending'
    AND nq.scheduled_at <= NOW()
    AND nq.retry_count < nq.max_retries
  ORDER BY nq.scheduled_at ASC
  LIMIT p_limit;
END;
$$;

-- Create function to update notification status
CREATE OR REPLACE FUNCTION public.update_notification_status(
  p_notification_id UUID,
  p_status VARCHAR(50),
  p_provider_response JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notification_queue
  SET 
    status = p_status,
    provider_response = p_provider_response,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE id = p_notification_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.queue_notification TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.update_notification_status TO service_role;

-- Insert default notification settings for existing tenants
INSERT INTO public.notification_settings (tenant_id, notification_type, is_enabled, provider_config)
SELECT 
  t.id,
  'whatsapp',
  true,
  '{"provider": "twilio", "webhook_url": null}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, notification_type) DO NOTHING;

INSERT INTO public.notification_settings (tenant_id, notification_type, is_enabled, provider_config)
SELECT 
  t.id,
  'email',
  true,
  '{"provider": "sendgrid", "from_email": "noreply@vibepos.com"}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, notification_type) DO NOTHING;

-- Insert default templates for existing tenants
INSERT INTO public.notification_templates (tenant_id, name, type, subject, content, variables)
SELECT 
  t.id,
  'order_confirmation',
  'whatsapp',
  NULL,
  'Thank you for your order! Order #{{order_number}} for {{total_amount}} has been confirmed. We will notify you when it''s ready for pickup.',
  '["order_number", "total_amount"]'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.notification_templates (tenant_id, name, type, subject, content, variables)
SELECT 
  t.id,
  'payment_received',
  'whatsapp',
  NULL,
  'Payment received! Thank you for your payment of {{amount}} for {{order_number}}. Your order is being processed.',
  '["amount", "order_number"]'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO public.notification_templates (tenant_id, name, type, subject, content, variables)
SELECT 
  t.id,
  'low_stock_alert',
  'email',
  'Low Stock Alert - {{product_name}}',
  'Product {{product_name}} (SKU: {{sku}}) is running low on stock. Current quantity: {{current_quantity}}. Please reorder soon.',
  '["product_name", "sku", "current_quantity"]'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id, name) DO NOTHING;
