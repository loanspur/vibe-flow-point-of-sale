-- Add annual pricing configuration columns to billing_plans
ALTER TABLE billing_plans 
ADD COLUMN IF NOT EXISTS annual_discount_months INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS annual_discount_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{}';

-- Update existing plans with default annual pricing (2 months free)
UPDATE billing_plans 
SET 
  annual_discount_months = 2,
  currency = 'KES',
  pricing_config = jsonb_build_object(
    'annual_enabled', true,
    'annual_discount_type', 'months',
    'annual_discount_value', 2
  )
WHERE annual_discount_months IS NULL;