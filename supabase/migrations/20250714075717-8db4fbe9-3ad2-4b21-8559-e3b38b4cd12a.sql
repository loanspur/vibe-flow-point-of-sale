-- Create payments table for multiple payment processing
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  cashier_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  valid_until TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quote_items table
CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "Tenant staff can view tenant payments" ON public.payments
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can manage tenant payments" ON public.payments
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND 
    get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
  );

-- RLS policies for quotes
CREATE POLICY "Tenant staff can view tenant quotes" ON public.quotes
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can manage tenant quotes" ON public.quotes
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND 
    get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
  );

-- RLS policies for quote_items  
CREATE POLICY "Tenant staff can view quote items" ON public.quote_items
  FOR SELECT USING (
    quote_id IN (SELECT id FROM public.quotes WHERE tenant_id = get_user_tenant_id())
  );

CREATE POLICY "Tenant staff can manage quote items" ON public.quote_items
  FOR ALL USING (
    quote_id IN (SELECT id FROM public.quotes WHERE tenant_id = get_user_tenant_id()) AND
    get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
  );

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();