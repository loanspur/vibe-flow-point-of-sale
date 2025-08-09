-- Enable required extensions for scheduling HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Generic updated_at trigger function (safe to create or replace)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID,
  quote_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  quote_id UUID NOT NULL,
  product_id UUID,
  variant_id UUID,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Useful indexes & constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_tenant_number ON public.quotes(tenant_id, quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_expiry_date ON public.quotes(tenant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_tenant ON public.quote_items(tenant_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_items_updated_at ON public.quote_items;
CREATE TRIGGER update_quote_items_updated_at
BEFORE UPDATE ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
DROP POLICY IF EXISTS "Tenant users can view quotes" ON public.quotes;
CREATE POLICY "Tenant users can view quotes"
ON public.quotes
FOR SELECT
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Tenant staff can manage quotes" ON public.quotes;
CREATE POLICY "Tenant staff can manage quotes"
ON public.quotes
FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
)
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
);

-- RLS Policies for quote_items
DROP POLICY IF EXISTS "Tenant users can view quote items" ON public.quote_items;
CREATE POLICY "Tenant users can view quote items"
ON public.quote_items
FOR SELECT
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Tenant staff can manage quote items" ON public.quote_items;
CREATE POLICY "Tenant staff can manage quote items"
ON public.quote_items
FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
)
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
);

-- Optional: maintain referential integrity to quotes for quote_items
-- (We avoid FK to auth or other reserved schemas; referencing quotes is safe.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quote_items_quote_id_fkey'
  ) THEN
    ALTER TABLE public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey
    FOREIGN KEY (quote_id)
    REFERENCES public.quotes(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Schedule daily reminders for expiring quotes and overdue invoices via edge function
-- Runs daily at 09:00 UTC
SELECT cron.schedule(
  'quote-invoice-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwtybhvdbbkbcelisuek.supabase.co/functions/v1/quote-invoice-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dHliaHZkYmJrYmNlbGlzdWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTE4MjYsImV4cCI6MjA2NzkyNzgyNn0.unXOuVkZ5zh4zizLe3wquHiDOBaPxKvbRduVUt5gcIE"}'::jsonb,
    body := '{"source":"cron","schedule":"daily"}'::jsonb
  ) AS request_id;
  $$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'quote-invoice-reminders-daily'
);
