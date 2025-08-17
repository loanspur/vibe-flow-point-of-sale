-- Create automation settings and bulk campaigns tables without duplicate triggers
CREATE TABLE IF NOT EXISTS public.whatsapp_automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- receipt_created, invoice_created, quote_created, payment_received, etc.
  is_enabled BOOLEAN DEFAULT false,
  template_id UUID,
  delay_minutes INTEGER DEFAULT 0, -- delay before sending
  conditions JSONB DEFAULT '{}'::jsonb, -- conditions for when to send
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, event_type)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_bulk_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_id UUID,
  target_contacts JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of contact IDs
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, completed, failed
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_bulk_campaign_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES whatsapp_bulk_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
  external_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bulk_campaign_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_automation_settings
DROP POLICY IF EXISTS "Tenant users can view their WhatsApp automation settings" ON public.whatsapp_automation_settings;
DROP POLICY IF EXISTS "Tenant managers can manage WhatsApp automation settings" ON public.whatsapp_automation_settings;

CREATE POLICY "Tenant users can view their WhatsApp automation settings" ON public.whatsapp_automation_settings
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage WhatsApp automation settings" ON public.whatsapp_automation_settings
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND
    get_current_user_role() IN ('superadmin', 'admin', 'manager')
  );

-- Create RLS policies for whatsapp_bulk_campaigns
DROP POLICY IF EXISTS "Tenant users can view their WhatsApp bulk campaigns" ON public.whatsapp_bulk_campaigns;
DROP POLICY IF EXISTS "Tenant staff can manage WhatsApp bulk campaigns" ON public.whatsapp_bulk_campaigns;

CREATE POLICY "Tenant users can view their WhatsApp bulk campaigns" ON public.whatsapp_bulk_campaigns
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can manage WhatsApp bulk campaigns" ON public.whatsapp_bulk_campaigns
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND
    get_current_user_role() IN ('superadmin', 'admin', 'manager', 'cashier')
  );

-- Create RLS policies for whatsapp_bulk_campaign_messages
DROP POLICY IF EXISTS "Tenant users can view their bulk campaign messages" ON public.whatsapp_bulk_campaign_messages;
DROP POLICY IF EXISTS "System can manage bulk campaign messages" ON public.whatsapp_bulk_campaign_messages;

CREATE POLICY "Tenant users can view their bulk campaign messages" ON public.whatsapp_bulk_campaign_messages
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM whatsapp_bulk_campaigns 
      WHERE tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "System can manage bulk campaign messages" ON public.whatsapp_bulk_campaign_messages
  FOR ALL USING (true);

-- Insert default automation settings for existing tenants
INSERT INTO public.whatsapp_automation_settings (tenant_id, event_type, is_enabled, delay_minutes)
SELECT t.id as tenant_id, event.event_type, false, 0
FROM tenants t,
(VALUES 
  ('receipt_created'),
  ('invoice_created'),
  ('quote_created'),
  ('payment_received'),
  ('payment_reminder'),
  ('order_shipped'),
  ('low_stock_alert')
) as event(event_type)
WHERE t.status IN ('active', 'trial')
ON CONFLICT (tenant_id, event_type) DO NOTHING;