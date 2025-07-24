-- Replace KSh with KES throughout the system for consistency
-- Update business settings to use KES instead of KSh
UPDATE business_settings 
SET currency_symbol = 'KES'
WHERE currency_symbol = 'KSh' OR currency_symbol = 'KSH' OR currency_symbol = 'Ksh';