-- Update any existing KSH currency codes to KES for standardization
-- KES is the correct ISO 4217 code for Kenyan Shilling

-- Update business settings table
UPDATE business_settings 
SET currency_code = 'KES'
WHERE currency_code = 'KSH';

-- Update any billing plans that might have KSH
UPDATE billing_plans 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{currency}', 
  '"KES"'
)
WHERE metadata->>'currency' = 'KSH';

-- Update any payment history records
UPDATE payment_history 
SET currency = 'KES'
WHERE currency = 'KSH';

-- Update any tenant subscriptions that might have KSH
UPDATE tenant_subscriptions 
SET currency = 'KES'
WHERE currency = 'KSH';

-- Update tenant subscription details as well
UPDATE tenant_subscription_details 
SET currency = 'KES'
WHERE currency = 'KSH';