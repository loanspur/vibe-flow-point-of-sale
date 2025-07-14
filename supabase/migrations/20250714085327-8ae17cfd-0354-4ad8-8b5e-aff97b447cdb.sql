-- Create business_settings table for tenant-specific configurations
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Company Information
  company_name TEXT,
  company_logo_url TEXT,
  business_registration_number TEXT,
  tax_identification_number TEXT,
  
  -- Contact Information
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address Information
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'United States',
  
  -- Business Settings
  currency_code TEXT DEFAULT 'USD',
  currency_symbol TEXT DEFAULT '$',
  timezone TEXT DEFAULT 'America/New_York',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  
  -- Tax Settings
  default_tax_rate DECIMAL(5,4) DEFAULT 0.0000,
  tax_name TEXT DEFAULT 'Tax',
  tax_inclusive BOOLEAN DEFAULT false,
  
  -- Receipt Settings
  receipt_header TEXT,
  receipt_footer TEXT,
  receipt_logo_url TEXT,
  print_customer_copy BOOLEAN DEFAULT true,
  print_merchant_copy BOOLEAN DEFAULT true,
  
  -- Business Hours (JSON format)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"open": "10:00", "close": "16:00", "closed": false},
    "sunday": {"open": "12:00", "close": "16:00", "closed": true}
  }',
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  low_stock_alerts BOOLEAN DEFAULT true,
  daily_reports BOOLEAN DEFAULT true,
  
  -- Security Settings
  session_timeout_minutes INTEGER DEFAULT 60,
  require_password_change BOOLEAN DEFAULT false,
  password_expiry_days INTEGER DEFAULT 90,
  
  -- Integration Settings
  enable_online_orders BOOLEAN DEFAULT false,
  enable_loyalty_program BOOLEAN DEFAULT false,
  enable_gift_cards BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Create payment_methods table for configurable payment options
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cash', 'card', 'digital', 'bank_transfer', 'other'
  is_active BOOLEAN DEFAULT true,
  requires_reference BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_locations table for multi-location businesses
CREATE TABLE public.store_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'United States',
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business_settings
CREATE POLICY "Tenant admins can manage business settings" 
ON public.business_settings 
FOR ALL 
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

CREATE POLICY "Tenant users can view business settings" 
ON public.business_settings 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for payment_methods
CREATE POLICY "Tenant admins can manage payment methods" 
ON public.payment_methods 
FOR ALL 
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

CREATE POLICY "Tenant users can view payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for store_locations
CREATE POLICY "Tenant admins can manage store locations" 
ON public.store_locations 
FOR ALL 
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

CREATE POLICY "Tenant users can view store locations" 
ON public.store_locations 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_locations_updated_at
BEFORE UPDATE ON public.store_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment methods for new tenants
INSERT INTO public.payment_methods (tenant_id, name, type, display_order) 
SELECT id, 'Cash', 'cash', 1 FROM public.tenants WHERE id NOT IN (SELECT DISTINCT tenant_id FROM public.payment_methods WHERE type = 'cash');

INSERT INTO public.payment_methods (tenant_id, name, type, display_order) 
SELECT id, 'Credit/Debit Card', 'card', 2 FROM public.tenants WHERE id NOT IN (SELECT DISTINCT tenant_id FROM public.payment_methods WHERE type = 'card');

INSERT INTO public.payment_methods (tenant_id, name, type, display_order) 
SELECT id, 'Digital Payment', 'digital', 3 FROM public.tenants WHERE id NOT IN (SELECT DISTINCT tenant_id FROM public.payment_methods WHERE type = 'digital');