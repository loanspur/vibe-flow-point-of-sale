-- Add comprehensive business settings enhancements

-- Add new columns to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS stock_accounting_method TEXT DEFAULT 'FIFO',
ADD COLUMN IF NOT EXISTS enable_combo_products BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_retail_pricing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_wholesale_pricing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_markup_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS auto_generate_sku BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_barcode_scanning BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_negative_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS enable_multi_location BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pos_auto_print_receipt BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pos_ask_customer_info BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pos_enable_discounts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pos_max_discount_percent DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS pos_enable_tips BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pos_default_payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS purchase_auto_receive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS purchase_enable_partial_receive BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS purchase_default_tax_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS email_smtp_host TEXT,
ADD COLUMN IF NOT EXISTS email_smtp_port INTEGER DEFAULT 587,
ADD COLUMN IF NOT EXISTS email_smtp_username TEXT,
ADD COLUMN IF NOT EXISTS email_smtp_password TEXT,
ADD COLUMN IF NOT EXISTS email_from_address TEXT,
ADD COLUMN IF NOT EXISTS email_from_name TEXT,
ADD COLUMN IF NOT EXISTS email_enable_ssl BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_enable_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_provider TEXT,
ADD COLUMN IF NOT EXISTS sms_api_key TEXT,
ADD COLUMN IF NOT EXISTS sms_sender_id TEXT,
ADD COLUMN IF NOT EXISTS sms_enable_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS invoice_auto_number BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_number_prefix TEXT DEFAULT 'INV-',
ADD COLUMN IF NOT EXISTS invoice_terms_conditions TEXT,
ADD COLUMN IF NOT EXISTS quote_template TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS quote_auto_number BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS quote_number_prefix TEXT DEFAULT 'QT-',
ADD COLUMN IF NOT EXISTS quote_validity_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS delivery_note_template TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS delivery_note_auto_number BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS delivery_note_prefix TEXT DEFAULT 'DN-',
ADD COLUMN IF NOT EXISTS enable_user_roles BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_login_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS account_lockout_duration INTEGER DEFAULT 15;

-- Create user_roles table for role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create user_role_assignments table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id, tenant_id)
);

-- Create product_pricing table for wholesale/retail pricing
CREATE TABLE IF NOT EXISTS public.product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  pricing_type TEXT NOT NULL, -- 'retail', 'wholesale', 'combo'
  price DECIMAL(10,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commission_agents table
CREATE TABLE IF NOT EXISTS public.commission_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed'
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Tenant admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

CREATE POLICY "Tenant users can view user roles" 
ON public.user_roles 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for user_role_assignments
CREATE POLICY "Tenant admins can manage role assignments" 
ON public.user_role_assignments 
FOR ALL 
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

CREATE POLICY "Users can view their own role assignments" 
ON public.user_role_assignments 
FOR SELECT 
USING ((user_id = auth.uid()) OR ((tenant_id = get_user_tenant_id()) AND is_tenant_admin()));

-- Create RLS policies for product_pricing
CREATE POLICY "Tenant managers can manage product pricing" 
ON public.product_pricing 
FOR ALL 
USING ((product_id IN (SELECT id FROM products WHERE tenant_id = get_user_tenant_id())) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view product pricing" 
ON public.product_pricing 
FOR SELECT 
USING (product_id IN (SELECT id FROM products WHERE tenant_id = get_user_tenant_id()));

-- Create RLS policies for commission_agents
CREATE POLICY "Tenant managers can manage commission agents" 
ON public.commission_agents 
FOR ALL 
USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view commission agents" 
ON public.commission_agents 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_role_assignments_updated_at
BEFORE UPDATE ON public.user_role_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_pricing_updated_at
BEFORE UPDATE ON public.product_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_agents_updated_at
BEFORE UPDATE ON public.commission_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default user roles for existing tenants
INSERT INTO public.user_roles (tenant_id, name, description, permissions, is_system_role)
SELECT 
  t.id,
  'Administrator',
  'Full system access',
  '{"all": true}',
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.tenant_id = t.id AND ur.name = 'Administrator'
);

INSERT INTO public.user_roles (tenant_id, name, description, permissions, is_system_role)
SELECT 
  t.id,
  'Manager',
  'Manage products, sales, and reports',
  '{"products": {"read": true, "write": true}, "sales": {"read": true, "write": true}, "reports": {"read": true}}',
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.tenant_id = t.id AND ur.name = 'Manager'
);

INSERT INTO public.user_roles (tenant_id, name, description, permissions, is_system_role)
SELECT 
  t.id,
  'Cashier',
  'Process sales and handle customers',
  '{"sales": {"read": true, "write": true}, "customers": {"read": true, "write": true}}',
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.tenant_id = t.id AND ur.name = 'Cashier'
);

-- Update contacts table to support commission agents
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS is_commission_agent BOOLEAN DEFAULT false;