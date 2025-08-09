-- Units of Measure (Base Unit) - Phase 1
-- 1) Create product_units table
CREATE TABLE IF NOT EXISTS public.product_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  abbreviation text NOT NULL,
  precision integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  -- Anyone can read units (safe, non-sensitive reference data)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_units' AND policyname = 'Anyone can view product units'
  ) THEN
    CREATE POLICY "Anyone can view product units"
    ON public.product_units
    FOR SELECT
    USING (true);
  END IF;

  -- Tenant admins can manage their own units
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_units' AND policyname = 'Tenant admins can manage their units'
  ) THEN
    CREATE POLICY "Tenant admins can manage their units"
    ON public.product_units
    FOR ALL
    USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
    WITH CHECK (tenant_id = get_user_tenant_id() AND is_tenant_admin());
  END IF;

  -- Superadmins can manage system units (tenant_id is NULL and is_system = true)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_units' AND policyname = 'Superadmins can manage system units'
  ) THEN
    CREATE POLICY "Superadmins can manage system units"
    ON public.product_units
    FOR ALL
    USING (is_system = true AND get_current_user_role() = 'superadmin')
    WITH CHECK (is_system = true AND get_current_user_role() = 'superadmin');
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_units_updated_at'
  ) THEN
    CREATE TRIGGER update_product_units_updated_at
    BEFORE UPDATE ON public.product_units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Alter products to reference a base unit (unit_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN unit_id uuid NULL;
  END IF;
END $$;

-- Add precision column (optional)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'unit_precision'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN unit_precision integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add foreign key for products.unit_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_unit_id_fkey'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.product_units (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Alter sale_items and purchase_items to store unit_id used in the line item
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sale_items' AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE public.sale_items
    ADD COLUMN unit_id uuid NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_items' AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE public.purchase_items
    ADD COLUMN unit_id uuid NULL;
  END IF;
END $$;

-- Add FKs for line items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_unit_id_fkey'
  ) THEN
    ALTER TABLE public.sale_items
    ADD CONSTRAINT sale_items_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.product_units (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_unit_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_items
    ADD CONSTRAINT purchase_items_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.product_units (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON public.products(unit_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_unit_id ON public.sale_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_unit_id ON public.purchase_items(unit_id);

-- 4) Defaulting trigger: if unit_id is NULL on line items, copy from product
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_default_unit_id_on_sale_items'
  ) THEN
    CREATE TRIGGER set_default_unit_id_on_sale_items
    BEFORE INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_unit_id();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_default_unit_id_on_purchase_items'
  ) THEN
    CREATE TRIGGER set_default_unit_id_on_purchase_items
    BEFORE INSERT ON public.purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_unit_id();
  END IF;
END $$;

-- 5) Seed system default units (id will be stable via unique code)
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

-- 6) Backfill existing products and line items to use base unit 'pc' when not set
WITH pc AS (
  SELECT id FROM public.product_units WHERE code = 'pc' LIMIT 1
)
UPDATE public.products p
SET unit_id = (SELECT id FROM pc)
WHERE p.unit_id IS NULL;

WITH pc AS (
  SELECT id FROM public.product_units WHERE code = 'pc' LIMIT 1
)
UPDATE public.sale_items si
SET unit_id = p.unit_id
FROM public.products p
WHERE si.product_id = p.id AND si.unit_id IS NULL;

WITH pc AS (
  SELECT id FROM public.product_units WHERE code = 'pc' LIMIT 1
)
UPDATE public.purchase_items pi
SET unit_id = p.unit_id
FROM public.products p
WHERE pi.product_id = p.id AND pi.unit_id IS NULL;