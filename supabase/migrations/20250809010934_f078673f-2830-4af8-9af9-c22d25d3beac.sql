-- Ensure code column exists and backfill before adding unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='code') THEN
    ALTER TABLE public.product_units ADD COLUMN code text;
  END IF;
END $$;

-- Backfill code from abbreviation or name where NULL
UPDATE public.product_units
SET code = COALESCE(NULLIF(lower(abbreviation), ''), regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
WHERE code IS NULL;

-- Add NOT NULL to code now that it's populated
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='code' AND is_nullable='YES'
  ) THEN
    ALTER TABLE public.product_units ALTER COLUMN code SET NOT NULL;
  END IF;
END $$;

-- Now (re)attempt unique constraint adjustment
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_units_code_key') THEN
    ALTER TABLE public.product_units DROP CONSTRAINT product_units_code_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_units_tenant_code_key') THEN
    ALTER TABLE public.product_units ADD CONSTRAINT product_units_tenant_code_key UNIQUE (tenant_id, code);
  END IF;
END $$;