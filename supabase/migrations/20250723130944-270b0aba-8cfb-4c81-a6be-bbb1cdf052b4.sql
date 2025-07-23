-- Update business settings to have correct KSh symbol for Kenyan Shilling
UPDATE business_settings 
SET currency_symbol = 'KSh'
WHERE currency_code = 'KES' AND currency_symbol = '$';