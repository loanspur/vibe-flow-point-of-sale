-- Add missing product settings columns to business_settings table
-- This ensures all product-related settings are available

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
