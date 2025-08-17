-- Create enhanced WhatsApp message templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- receipt, invoice, quote, welcome, reminder, marketing, support, etc.
  subject TEXT,
  message_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enhanced message logs table if it doesn't exist or update it
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  whatsapp_config_id UUID,
  template_id UUID,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, read, failed
  external_id TEXT,
  cost NUMERIC DEFAULT 0,
  delivery_status_webhook_received_at TIMESTAMP WITH TIME ZONE,
  webhook_data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp automation settings table
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

-- Create bulk messaging campaigns table
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

-- Create bulk campaign messages table
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

-- Enable RLS on all tables
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bulk_campaign_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_templates
CREATE POLICY "Tenant users can view their WhatsApp templates" ON public.whatsapp_templates
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage WhatsApp templates" ON public.whatsapp_templates
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND
    get_current_user_role() IN ('superadmin', 'admin', 'manager')
  );

-- Create RLS policies for whatsapp_message_logs
CREATE POLICY "Tenant users can view their WhatsApp message logs" ON public.whatsapp_message_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can create WhatsApp message logs" ON public.whatsapp_message_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update WhatsApp message logs" ON public.whatsapp_message_logs
  FOR UPDATE USING (true);

-- Create RLS policies for whatsapp_automation_settings
CREATE POLICY "Tenant users can view their WhatsApp automation settings" ON public.whatsapp_automation_settings
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage WhatsApp automation settings" ON public.whatsapp_automation_settings
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND
    get_current_user_role() IN ('superadmin', 'admin', 'manager')
  );

-- Create RLS policies for whatsapp_bulk_campaigns
CREATE POLICY "Tenant users can view their WhatsApp bulk campaigns" ON public.whatsapp_bulk_campaigns
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can manage WhatsApp bulk campaigns" ON public.whatsapp_bulk_campaigns
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND
    get_current_user_role() IN ('superadmin', 'admin', 'manager', 'cashier')
  );

-- Create RLS policies for whatsapp_bulk_campaign_messages
CREATE POLICY "Tenant users can view their bulk campaign messages" ON public.whatsapp_bulk_campaign_messages
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM whatsapp_bulk_campaigns 
      WHERE tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "System can manage bulk campaign messages" ON public.whatsapp_bulk_campaign_messages
  FOR ALL USING (true);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_templates_updated_at();

CREATE TRIGGER update_whatsapp_message_logs_updated_at
  BEFORE UPDATE ON public.whatsapp_message_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_updated_at();

CREATE OR REPLACE FUNCTION public.update_whatsapp_automation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_automation_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_automation_settings_updated_at();

CREATE OR REPLACE FUNCTION public.update_whatsapp_bulk_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_bulk_campaigns_updated_at
  BEFORE UPDATE ON public.whatsapp_bulk_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_bulk_campaigns_updated_at();

-- Insert default templates for different business scenarios
INSERT INTO public.whatsapp_templates (tenant_id, name, type, subject, message_body, variables, is_default) 
SELECT 
  t.id as tenant_id,
  template.name,
  template.type,
  template.subject,
  template.message_body,
  template.variables::jsonb,
  true as is_default
FROM tenants t,
(VALUES 
  ('Welcome Message', 'welcome', 'Welcome to {company_name}!', 'Hello {customer_name}! 👋\n\nWelcome to {company_name}! We''re excited to have you as our customer.\n\nFor any questions, feel free to contact us.\n\nBest regards,\n{company_name} Team', '["customer_name", "company_name"]'),
  ('Payment Reminder', 'reminder', 'Payment Reminder - {invoice_number}', 'Dear {customer_name},\n\nThis is a friendly reminder that your invoice #{invoice_number} for {amount} is due on {due_date}.\n\nPlease make your payment at your earliest convenience.\n\nThank you!\n{company_name}', '["customer_name", "invoice_number", "amount", "due_date", "company_name"]'),
  ('Order Confirmation', 'order', 'Order Confirmed - #{order_number}', 'Hi {customer_name}! ✅\n\nYour order #{order_number} has been confirmed.\n\nTotal Amount: {total_amount}\nExpected Delivery: {delivery_date}\n\nWe''ll keep you updated on your order status.\n\nThank you for choosing {company_name}!', '["customer_name", "order_number", "total_amount", "delivery_date", "company_name"]'),
  ('Appointment Reminder', 'appointment', 'Appointment Reminder', 'Hello {customer_name}! ⏰\n\nThis is a reminder about your appointment scheduled for {appointment_date} at {appointment_time}.\n\nLocation: {location}\n\nPlease let us know if you need to reschedule.\n\nSee you soon!\n{company_name}', '["customer_name", "appointment_date", "appointment_time", "location", "company_name"]'),
  ('Support Follow-up', 'support', 'How did we do?', 'Hi {customer_name}! 😊\n\nWe hope we were able to resolve your recent inquiry satisfactorily.\n\nYour feedback is important to us. If you have any additional questions or concerns, please don''t hesitate to reach out.\n\nThank you for choosing {company_name}!', '["customer_name", "company_name"]'),
  ('Promotional Offer', 'marketing', 'Special Offer Just for You! 🎉', 'Hello {customer_name}! 🎉\n\nWe have an exclusive offer just for you!\n\n{offer_details}\n\nValid until: {expiry_date}\nPromo Code: {promo_code}\n\nDon''t miss out on this amazing deal!\n\nShop now: {shop_link}\n\n{company_name}', '["customer_name", "offer_details", "expiry_date", "promo_code", "shop_link", "company_name"]'),
  ('Low Stock Alert', 'internal', 'Low Stock Alert', 'Alert! 📉\n\nProduct: {product_name}\nCurrent Stock: {current_stock}\nReorder Level: {reorder_level}\n\nAction required to restock this item.\n\n{company_name} Inventory System', '["product_name", "current_stock", "reorder_level", "company_name"]'),
  ('Birthday Wishes', 'marketing', 'Happy Birthday! 🎂', 'Happy Birthday {customer_name}! 🎂🎉\n\nWishing you a wonderful day filled with joy and happiness!\n\nAs a birthday gift, enjoy {discount}% off your next purchase with code: BIRTHDAY{year}\n\nValid for 7 days.\n\nCelebrate with {company_name}! 🎈', '["customer_name", "discount", "year", "company_name"]')
) as template(name, type, subject, message_body, variables)
WHERE t.status IN ('active', 'trial')
ON CONFLICT DO NOTHING;