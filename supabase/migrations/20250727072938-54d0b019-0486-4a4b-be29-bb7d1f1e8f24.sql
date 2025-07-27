-- Create WhatsApp phone numbers management table
CREATE TABLE public.tenant_whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, rejected, suspended
  verification_code TEXT,
  verification_attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_verification_attempt TIMESTAMP WITH TIME ZONE,
  waba_phone_number_id TEXT, -- WhatsApp Business API phone number ID
  business_profile JSONB DEFAULT '{}',
  webhook_url TEXT,
  webhook_verify_token TEXT,
  is_active BOOLEAN DEFAULT true,
  monthly_fee NUMERIC DEFAULT 29.99, -- Monthly add-on fee
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(phone_number),
  UNIQUE(tenant_id, phone_number)
);

-- Create WhatsApp message templates table
CREATE TABLE public.whatsapp_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  template_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'MARKETING', -- MARKETING, UTILITY, AUTHENTICATION
  language TEXT NOT NULL DEFAULT 'en',
  header_type TEXT, -- TEXT, IMAGE, VIDEO, DOCUMENT
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  waba_template_id TEXT, -- WhatsApp Business API template ID
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  quality_score TEXT, -- HIGH, MEDIUM, LOW
  is_system_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, template_name, language)
);

-- Create WhatsApp message logs table
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  phone_number_id UUID NOT NULL REFERENCES public.tenant_whatsapp_numbers(id),
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, template, media
  template_id UUID REFERENCES public.whatsapp_message_templates(id),
  message_content TEXT,
  media_url TEXT,
  media_type TEXT,
  waba_message_id TEXT, -- WhatsApp Business API message ID
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, read, failed
  error_code TEXT,
  error_message TEXT,
  delivery_status JSONB DEFAULT '{}',
  cost NUMERIC DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp billing records table
CREATE TABLE public.whatsapp_billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  phone_number_id UUID NOT NULL REFERENCES public.tenant_whatsapp_numbers(id),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  base_fee NUMERIC NOT NULL DEFAULT 29.99,
  message_count INTEGER DEFAULT 0,
  message_fees NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_billing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_whatsapp_numbers
CREATE POLICY "Tenant admins can manage their WhatsApp numbers"
ON public.tenant_whatsapp_numbers
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
WITH CHECK (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Superadmins can manage all WhatsApp numbers"
ON public.tenant_whatsapp_numbers
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin'::user_role)
WITH CHECK (get_current_user_role() = 'superadmin'::user_role);

CREATE POLICY "Tenant users can view their WhatsApp numbers"
ON public.tenant_whatsapp_numbers
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- RLS Policies for whatsapp_message_templates
CREATE POLICY "Tenant admins can manage their templates"
ON public.whatsapp_message_templates
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
WITH CHECK (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Users can view system templates"
ON public.whatsapp_message_templates
FOR SELECT
TO authenticated
USING (is_system_template = true OR tenant_id = get_user_tenant_id());

CREATE POLICY "Superadmins can manage all templates"
ON public.whatsapp_message_templates
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin'::user_role)
WITH CHECK (get_current_user_role() = 'superadmin'::user_role);

-- RLS Policies for whatsapp_message_logs
CREATE POLICY "Tenant users can view their message logs"
ON public.whatsapp_message_logs
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can create message logs"
ON public.whatsapp_message_logs
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Superadmins can manage all message logs"
ON public.whatsapp_message_logs
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin'::user_role)
WITH CHECK (get_current_user_role() = 'superadmin'::user_role);

-- RLS Policies for whatsapp_billing
CREATE POLICY "Tenant admins can view their billing"
ON public.whatsapp_billing
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Superadmins can manage all billing"
ON public.whatsapp_billing
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin'::user_role)
WITH CHECK (get_current_user_role() = 'superadmin'::user_role);

-- Create indexes for performance
CREATE INDEX idx_tenant_whatsapp_numbers_tenant_id ON public.tenant_whatsapp_numbers(tenant_id);
CREATE INDEX idx_tenant_whatsapp_numbers_status ON public.tenant_whatsapp_numbers(status);
CREATE INDEX idx_whatsapp_message_templates_tenant_id ON public.whatsapp_message_templates(tenant_id);
CREATE INDEX idx_whatsapp_message_logs_tenant_id ON public.whatsapp_message_logs(tenant_id);
CREATE INDEX idx_whatsapp_message_logs_created_at ON public.whatsapp_message_logs(created_at);
CREATE INDEX idx_whatsapp_billing_tenant_id ON public.whatsapp_billing(tenant_id);

-- Create functions for WhatsApp management
CREATE OR REPLACE FUNCTION public.create_whatsapp_billing_record(
  tenant_id_param UUID,
  phone_number_id_param UUID,
  billing_period_start_param DATE,
  billing_period_end_param DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  billing_id UUID;
  message_count_val INTEGER;
  message_fees_val NUMERIC;
  base_fee_val NUMERIC;
BEGIN
  -- Get base fee from phone number record
  SELECT monthly_fee INTO base_fee_val
  FROM public.tenant_whatsapp_numbers
  WHERE id = phone_number_id_param;
  
  -- Calculate message count and fees for the period
  SELECT COUNT(*), COALESCE(SUM(cost), 0)
  INTO message_count_val, message_fees_val
  FROM public.whatsapp_message_logs
  WHERE phone_number_id = phone_number_id_param
    AND status = 'delivered'
    AND created_at >= billing_period_start_param
    AND created_at < billing_period_end_param + INTERVAL '1 day';
  
  -- Create billing record
  INSERT INTO public.whatsapp_billing (
    tenant_id,
    phone_number_id,
    billing_period_start,
    billing_period_end,
    base_fee,
    message_count,
    message_fees,
    total_amount
  ) VALUES (
    tenant_id_param,
    phone_number_id_param,
    billing_period_start_param,
    billing_period_end_param,
    COALESCE(base_fee_val, 29.99),
    message_count_val,
    message_fees_val,
    COALESCE(base_fee_val, 29.99) + message_fees_val
  ) RETURNING id INTO billing_id;
  
  RETURN billing_id;
END;
$$;

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_whatsapp_numbers_updated_at
  BEFORE UPDATE ON public.tenant_whatsapp_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_whatsapp();

CREATE TRIGGER update_whatsapp_message_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_whatsapp();

-- Add WhatsApp add-on to default billing plans
UPDATE public.billing_plans 
SET add_ons = COALESCE(add_ons, '[]'::jsonb) || '[{"name": "WhatsApp Business", "description": "Send messages to customers via WhatsApp", "price": 29.99, "billing_cycle": "monthly", "feature_key": "whatsapp_business"}]'::jsonb
WHERE add_ons IS NULL OR NOT add_ons @> '[{"feature_key": "whatsapp_business"}]'::jsonb;