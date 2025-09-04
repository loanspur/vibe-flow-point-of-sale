-- Add cost_price field to product_variants table for cost tracking
-- This migration adds the missing cost_price column that the application expects

ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0.00;

-- Add comment for documentation
COMMENT ON COLUMN public.product_variants.cost_price IS 'Cost price for this variant, used for profit calculations';

-- Create index for better performance on cost price queries
CREATE INDEX IF NOT EXISTS idx_product_variants_cost_price ON public.product_variants(cost_price) WHERE cost_price IS NOT NULL;
