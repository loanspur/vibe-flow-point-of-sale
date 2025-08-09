-- Safe idempotent migration for base units (product_units)

-- 0) Create table if missing
CREATE TABLE IF NOT EXISTS public.product_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 0.1) Ensure required columns exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='tenant_id') THEN
    ALTER TABLE public.product_units ADD COLUMN tenant_id uuid NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='name') THEN
    ALTER TABLE public.product_units ADD COLUMN name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='code') THEN
    ALTER TABLE public.product_units ADD COLUMN code text NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='abbreviation') THEN
    ALTER TABLE public.product_units ADD COLUMN abbreviation text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='precision') THEN
    ALTER TABLE public.product_units ADD COLUMN precision integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='is_active') THEN
    ALTER TABLE public.product_units ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='is_system') THEN
    ALTER TABLE public.product_units ADD COLUMN is_system boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='created_at') THEN
    ALTER TABLE public.product_units ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_units' AND column_name='updated_at') THEN
    ALTER TABLE public.product_units ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- 0.2) Ensure unique constraint on code
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_units_code_key'
  ) THEN
    ALTER TABLE public.product_units ADD CONSTRAINT product_units_code_key UNIQUE (code);
  END IF;
END $$;

-- 1) Enable RLS
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;

-- 1.1) Policies (create if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_units' AND policyname='Anyone can view product units'
  ) THEN
    CREATE POLICY "Anyone can view product units" ON public.product_units FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_units' AND policyname='Tenant admins can manage their units'
  ) THEN
    CREATE POLICY "Tenant admins can manage their units" ON public.product_units FOR ALL
    USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
    WITH CHECK (tenant_id = get_user_tenant_id() AND is_tenant_admin());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_units' AND policyname='Superadmins can manage system units'
  ) THEN
    CREATE POLICY "Superadmins can manage system units" ON public.product_units FOR ALL
    USING (is_system = true AND get_current_user_role() = 'superadmin')
    WITH CHECK (is_system = true AND get_current_user_role() = 'superadmin');
  END IF;
END $$;

-- 1.2) updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_product_units_updated_at') THEN
    CREATE TRIGGER update_product_units_updated_at BEFORE UPDATE ON public.product_units
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Ensure products has unit fields and FK
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_id') THEN
    ALTER TABLE public.products ADD COLUMN unit_id uuid NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_precision') THEN
    ALTER TABLE public.products ADD COLUMN unit_precision integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_unit_id_fkey') THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.product_units(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Ensure line items have unit_id and FK
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sale_items' AND column_name='unit_id') THEN
    ALTER TABLE public.sale_items ADD COLUMN unit_id uuid NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchase_items' AND column_name='unit_id') THEN
    ALTER TABLE public.purchase_items ADD COLUMN unit_id uuid NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sale_items_unit_id_fkey') THEN
    ALTER TABLE public.sale_items
    ADD CONSTRAINT sale_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.product_units(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='purchase_items_unit_id_fkey') THEN
    ALTER TABLE public.purchase_items
    ADD CONSTRAINT purchase_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.product_units(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON public.products(unit_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_unit_id ON public.sale_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_unit_id ON public.purchase_items(unit_id);

-- 4) Defaulting trigger
CREATE OR REPLACE FUNCTION public.set_default_unit_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.unit_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT unit_id INTO NEW.unit_id FROM public.products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_default_unit_id_on_sale_items') THEN
    CREATE TRIGGER set_default_unit_id_on_sale_items BEFORE INSERT ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.set_default_unit_id();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_default_unit_id_on_purchase_items') THEN
    CREATE TRIGGER set_default_unit_id_on_purchase_items BEFORE INSERT ON public.purchase_items
    FOR EACH ROW EXECUTE FUNCTION public.set_default_unit_id();
  END IF;
END $$;

-- 5) Seed system units
INSERT INTO public.product_units (tenant_id, name, code, abbreviation, precision, is_active, is_system)
VALUES
  (NULL, 'Piece', 'pc', 'pc', 0, true, true),
  (NULL, 'Box', 'box', 'box', 0, true, true),
  (NULL, 'Kilogram', 'kg', 'kg', 3, true, true),
  (NULL, 'Gram', 'g', 'g', 0, true, true),
  (NULL, 'Liter', 'l', 'L', 3, true, true),
  (NULL, 'Milliliter', 'ml', 'mL', 0, true, true),
  (NULL, 'Meter', 'm', 'm', 2, true, true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  abbreviation = EXCLUDED.abbreviation,
  precision = EXCLUDED.precision,
  is_active = EXCLUDED.is_active,
  is_system = true,
  updated_at = now();

-- 6) Backfill products and line items
WITH pc AS (
  SELECT id FROM public.product_units WHERE code = 'pc' LIMIT 1
)
UPDATE public.products p
SET unit_id = (SELECT id FROM pc)
WHERE p.unit_id IS NULL;

UPDATE public.sale_items si
SET unit_id = p.unit_id
FROM public.products p
WHERE si.product_id = p.id AND si.unit_id IS NULL;

UPDATE public.purchase_items pi
SET unit_id = p.unit_id
FROM public.products p
WHERE pi.product_id = p.id AND pi.unit_id IS NULL;