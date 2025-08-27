-- Add missing product settings columns to business_settings table
-- Run this script in your Supabase SQL Editor to add all the missing columns

-- Product and inventory features
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS enable_brands boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_overselling boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_product_units boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_product_expiry boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_warranty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_fixed_pricing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_generate_sku boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_barcode_scanning boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_negative_stock boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_accounting_method text DEFAULT 'FIFO',
ADD COLUMN IF NOT EXISTS default_markup_percentage decimal(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS enable_retail_pricing boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_wholesale_pricing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_combo_products boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS low_stock_alerts boolean DEFAULT true;

-- Ensure tax_inclusive column exists (it might be missing)
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN public.business_settings.enable_brands IS 'Enable brand management for products';
COMMENT ON COLUMN public.business_settings.enable_overselling IS 'Allow sales when stock is insufficient';
COMMENT ON COLUMN public.business_settings.enable_product_units IS 'Enable unit management (pieces, kg, liters, etc.)';
COMMENT ON COLUMN public.business_settings.enable_product_expiry IS 'Track product expiration dates';
COMMENT ON COLUMN public.business_settings.enable_warranty IS 'Enable warranty tracking for products';
COMMENT ON COLUMN public.business_settings.enable_fixed_pricing IS 'Prevent price modifications after setup';
COMMENT ON COLUMN public.business_settings.auto_generate_sku IS 'Automatically generate SKU codes for new products';
COMMENT ON COLUMN public.business_settings.enable_barcode_scanning IS 'Enable barcode scanning for products';
COMMENT ON COLUMN public.business_settings.enable_negative_stock IS 'Allow negative stock levels';
COMMENT ON COLUMN public.business_settings.stock_accounting_method IS 'Method for calculating stock value (FIFO, LIFO, AVERAGE)';
COMMENT ON COLUMN public.business_settings.default_markup_percentage IS 'Default markup percentage for new products';
COMMENT ON COLUMN public.business_settings.enable_retail_pricing IS 'Enable retail price management';
COMMENT ON COLUMN public.business_settings.enable_wholesale_pricing IS 'Enable wholesale price management';
COMMENT ON COLUMN public.business_settings.enable_combo_products IS 'Enable bundle/combo product creation';
COMMENT ON COLUMN public.business_settings.low_stock_threshold IS 'Minimum stock level before alert';
COMMENT ON COLUMN public.business_settings.low_stock_alerts IS 'Show alerts when products are running low';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'business_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;
