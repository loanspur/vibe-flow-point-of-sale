-- Update any existing KSH currency codes to KES for standardization
-- KES is the correct ISO 4217 code for Kenyan Shilling

-- Update business settings table
UPDATE business_settings 
SET currency_code = 'KES'
WHERE currency_code = 'KSH';

-- Update any payment history records
UPDATE payment_history 
SET currency = 'KES'
WHERE currency = 'KSH';