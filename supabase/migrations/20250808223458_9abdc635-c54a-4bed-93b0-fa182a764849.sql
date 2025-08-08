-- Make migration compatible with existing schema
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at columns exist where needed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.quote_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Idempotent indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_tenant_number ON public.quotes(tenant_id, quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(tenant_id, status);
-- Use existing valid_until column instead of expiry_date
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON public.quotes(tenant_id, valid_until);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);

-- Triggers to keep updated_at fresh
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_items_updated_at ON public.quote_items;
CREATE TRIGGER update_quote_items_updated_at
BEFORE UPDATE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (safe and idempotent)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Cron job for reminders at 09:00 UTC daily (avoid duplicate)
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
