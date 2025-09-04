-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'crypto', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_reference BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  processing_fee_percentage NUMERIC(5,2) DEFAULT 0.00,
  minimum_amount NUMERIC(15,2) DEFAULT 0.00,
  maximum_amount NUMERIC(15,2),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment_integrations table  
CREATE TABLE public.payment_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paystack', 'paypal', 'square', 'mpesa', 'flutterwave', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  api_key TEXT,
  secret_key TEXT,
  webhook_url TEXT,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,
  currency_code TEXT NOT NULL DEFAULT 'KES',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_methods
CREATE POLICY "Tenant users can view payment methods" ON public.payment_methods
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage payment methods" ON public.payment_methods
FOR ALL USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

-- Create RLS policies for payment_integrations  
CREATE POLICY "Tenant users can view payment integrations" ON public.payment_integrations
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage payment integrations" ON public.payment_integrations
FOR ALL USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

-- Insert default payment methods
INSERT INTO public.payment_methods (tenant_id, name, type, is_active, requires_reference, description, processing_fee_percentage, minimum_amount, display_order)
SELECT 
  t.id,
  'Cash',
  'cash',
  true,
  false,
  'Physical cash payments',
  0.00,
  0.00,
  1
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm WHERE pm.tenant_id = t.id AND pm.name = 'Cash'
);

INSERT INTO public.payment_methods (tenant_id, name, type, is_active, requires_reference, description, processing_fee_percentage, minimum_amount, display_order)
SELECT 
  t.id,
  'Credit Card',
  'card', 
  true,
  true,
  'Credit and debit card payments',
  2.50,
  1.00,
  2
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm WHERE pm.tenant_id = t.id AND pm.name = 'Credit Card'
);