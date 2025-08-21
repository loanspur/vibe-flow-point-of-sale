-- Create WhatsApp configurations table for tenant-specific settings
CREATE TABLE IF NOT EXISTS public.tenant_whatsapp_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp message templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('receipt', 'invoice', 'quote', 'general', 'reminder')),
  subject TEXT,
  message_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create WhatsApp message logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  whatsapp_config_id UUID REFERENCES public.tenant_whatsapp_configs(id),
  template_id UUID REFERENCES public.whatsapp_templates(id),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tenant_whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant_whatsapp_configs
CREATE POLICY "Tenant admins can manage WhatsApp configs" 
ON public.tenant_whatsapp_configs 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Tenant users can view WhatsApp configs" 
ON public.tenant_whatsapp_configs 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for whatsapp_templates
CREATE POLICY "Tenant admins can manage WhatsApp templates" 
ON public.whatsapp_templates 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view WhatsApp templates" 
ON public.whatsapp_templates 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for whatsapp_message_logs
CREATE POLICY "Tenant users can view WhatsApp message logs" 
ON public.whatsapp_message_logs 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can manage WhatsApp message logs" 
ON public.whatsapp_message_logs 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_whatsapp_configs_tenant_id ON public.tenant_whatsapp_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_id ON public.whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_type ON public.whatsapp_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_tenant_id ON public.whatsapp_message_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_status ON public.whatsapp_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_created_at ON public.whatsapp_message_logs(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_whatsapp_configs_updated_at
  BEFORE UPDATE ON public.tenant_whatsapp_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_message_logs_updated_at
  BEFORE UPDATE ON public.whatsapp_message_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_updated_at();