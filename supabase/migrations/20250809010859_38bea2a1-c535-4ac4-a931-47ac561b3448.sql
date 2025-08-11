-- Fix product_units constraint and seed per-tenant

-- 1) Adjust unique constraint to be per-tenant
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_units_code_key') THEN
    ALTER TABLE public.product_units DROP CONSTRAINT product_units_code_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_units_tenant_code_key') THEN
    ALTER TABLE public.product_units ADD CONSTRAINT product_units_tenant_code_key UNIQUE (tenant_id, code);
  END IF;
END $$;

-- 2) Seed default units for each tenant
WITH unit_templates AS (
  SELECT * FROM (
    VALUES
      ('Piece'::text, 'pc'::text, 'pc'::text, 0),
      ('Box', 'box', 'box', 0),
      ('Kilogram', 'kg', 'kg', 3),
      ('Gram', 'g', 'g', 0),
      ('Liter', 'l', 'L', 3),
      ('Milliliter', 'ml', 'mL', 0),
      ('Meter', 'm', 'm', 2)
  ) AS v(name, code, abbreviation, precision)
)
INSERT INTO public.product_units (tenant_id, name, code, abbreviation, precision, is_active, is_system)
SELECT t.id, u.name, u.code, u.abbreviation, u.precision, true, false
FROM public.tenants t
CROSS JOIN unit_templates u
ON CONFLICT (tenant_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  abbreviation = EXCLUDED.abbreviation,
  precision = EXCLUDED.precision,
  is_active = true,
  updated_at = now();

-- 3) Backfill products and line items with tenant-specific 'pc'
-- Map each tenant's 'pc' id
WITH pcs AS (
  SELECT pu.tenant_id, pu.id AS unit_id
  FROM public.product_units pu
  WHERE pu.code = 'pc'
)
UPDATE public.products p
SET unit_id = pcs.unit_id
FROM pcs
WHERE p.tenant_id = pcs.tenant_id AND p.unit_id IS NULL;

WITH pcs AS (
  SELECT pu.tenant_id, pu.id AS unit_id
  FROM public.product_units pu
  WHERE pu.code = 'pc'
)
UPDATE public.sale_items si
SET unit_id = pcs.unit_id
FROM public.products p
JOIN pcs ON p.tenant_id = pcs.tenant_id
WHERE si.product_id = p.id AND si.unit_id IS NULL;

WITH pcs AS (
  SELECT pu.tenant_id, pu.id AS unit_id
  FROM public.product_units pu
  WHERE pu.code = 'pc'
)
UPDATE public.purchase_items pi
SET unit_id = pcs.unit_id
FROM public.products p
JOIN pcs ON p.tenant_id = pcs.tenant_id
WHERE pi.product_id = p.id AND pi.unit_id IS NULL;