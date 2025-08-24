-- Create customer_subscriptions table for tenant-to-customer recurring services
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  subscription_name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
  billing_day INTEGER NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 31),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date DATE NOT NULL,
  next_invoice_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, customer_id, subscription_name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_tenant_status ON public.customer_subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_next_invoice ON public.customer_subscriptions(next_invoice_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_customer ON public.customer_subscriptions(customer_id);

-- Add RLS policies
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for tenant users to manage their customer subscriptions
CREATE POLICY "Tenant users can manage their customer subscriptions" ON public.customer_subscriptions
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Policy for superadmins
CREATE POLICY "Superadmins can manage all customer subscriptions" ON public.customer_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
