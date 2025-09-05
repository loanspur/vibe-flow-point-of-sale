-- Debug Purchases 400 Error
-- This migration helps identify what might be causing the 400 error when creating purchases

-- Add missing columns to purchases table if they don't exist
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS expected_date date;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.store_locations(id);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS shipping_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;

-- Add missing columns to purchase_items table if they don't exist
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.product_units(id);

-- Add helpful comments
COMMENT ON COLUMN public.purchases.discount_amount IS 'Discount amount applied to the purchase (default: 0)';
COMMENT ON COLUMN public.purchases.expected_date IS 'Expected delivery date for the purchase';
COMMENT ON COLUMN public.purchases.location_id IS 'Location where the purchase will be received';
COMMENT ON COLUMN public.purchases.shipping_amount IS 'Shipping cost for the purchase (default: 0)';
COMMENT ON COLUMN public.purchases.tax_amount IS 'Tax amount for the purchase (default: 0)';
