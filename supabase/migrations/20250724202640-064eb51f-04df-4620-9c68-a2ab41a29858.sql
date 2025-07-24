-- Fix all business settings to use KES currency symbol
UPDATE business_settings 
SET currency_symbol = 'KES' 
WHERE currency_code = 'KES' AND (currency_symbol = '$' OR currency_symbol IS NULL OR currency_symbol = '');