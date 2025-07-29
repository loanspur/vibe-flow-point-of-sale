-- Fix currency symbols for all tenants to match their currency codes
UPDATE business_settings 
SET currency_symbol = CASE 
  WHEN currency_code = 'USD' THEN '$'
  WHEN currency_code = 'KES' THEN 'KES'
  WHEN currency_code = 'EUR' THEN '€'
  WHEN currency_code = 'GBP' THEN '£'
  WHEN currency_code = 'JPY' THEN '¥'
  WHEN currency_code = 'CNY' THEN '¥'
  WHEN currency_code = 'INR' THEN '₹'
  WHEN currency_code = 'NGN' THEN '₦'
  WHEN currency_code = 'ZAR' THEN 'R'
  WHEN currency_code = 'UGX' THEN 'USh'
  WHEN currency_code = 'TZS' THEN 'TSh'
  WHEN currency_code = 'RWF' THEN 'RF'
  WHEN currency_code = 'ETB' THEN 'Br'
  WHEN currency_code = 'GHS' THEN '₵'
  WHEN currency_code = 'XOF' THEN 'CFA'
  WHEN currency_code = 'XAF' THEN 'CFA'
  WHEN currency_code = 'EGP' THEN '£E'
  WHEN currency_code = 'MAD' THEN 'DH'
  WHEN currency_code = 'CAD' THEN 'C$'
  WHEN currency_code = 'AUD' THEN 'A$'
  WHEN currency_code = 'BRL' THEN 'R$'
  ELSE currency_code
END
WHERE currency_symbol != CASE 
  WHEN currency_code = 'USD' THEN '$'
  WHEN currency_code = 'KES' THEN 'KES'
  WHEN currency_code = 'EUR' THEN '€'
  WHEN currency_code = 'GBP' THEN '£'
  WHEN currency_code = 'JPY' THEN '¥'
  WHEN currency_code = 'CNY' THEN '¥'
  WHEN currency_code = 'INR' THEN '₹'
  WHEN currency_code = 'NGN' THEN '₦'
  WHEN currency_code = 'ZAR' THEN 'R'
  WHEN currency_code = 'UGX' THEN 'USh'
  WHEN currency_code = 'TZS' THEN 'TSh'
  WHEN currency_code = 'RWF' THEN 'RF'
  WHEN currency_code = 'ETB' THEN 'Br'
  WHEN currency_code = 'GHS' THEN '₵'
  WHEN currency_code = 'XOF' THEN 'CFA'
  WHEN currency_code = 'XAF' THEN 'CFA'
  WHEN currency_code = 'EGP' THEN '£E'
  WHEN currency_code = 'MAD' THEN 'DH'
  WHEN currency_code = 'CAD' THEN 'C$'
  WHEN currency_code = 'AUD' THEN 'A$'
  WHEN currency_code = 'BRL' THEN 'R$'
  ELSE currency_code
END;

-- Create a function to automatically update currency symbol when currency code changes
CREATE OR REPLACE FUNCTION update_currency_symbol_on_code_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update symbol if currency_code has changed
  IF OLD.currency_code IS DISTINCT FROM NEW.currency_code THEN
    NEW.currency_symbol = CASE 
      WHEN NEW.currency_code = 'USD' THEN '$'
      WHEN NEW.currency_code = 'KES' THEN 'KES'
      WHEN NEW.currency_code = 'EUR' THEN '€'
      WHEN NEW.currency_code = 'GBP' THEN '£'
      WHEN NEW.currency_code = 'JPY' THEN '¥'
      WHEN NEW.currency_code = 'CNY' THEN '¥'
      WHEN NEW.currency_code = 'INR' THEN '₹'
      WHEN NEW.currency_code = 'NGN' THEN '₦'
      WHEN NEW.currency_code = 'ZAR' THEN 'R'
      WHEN NEW.currency_code = 'UGX' THEN 'USh'
      WHEN NEW.currency_code = 'TZS' THEN 'TSh'
      WHEN NEW.currency_code = 'RWF' THEN 'RF'
      WHEN NEW.currency_code = 'ETB' THEN 'Br'
      WHEN NEW.currency_code = 'GHS' THEN '₵'
      WHEN NEW.currency_code = 'XOF' THEN 'CFA'
      WHEN NEW.currency_code = 'XAF' THEN 'CFA'
      WHEN NEW.currency_code = 'EGP' THEN '£E'
      WHEN NEW.currency_code = 'MAD' THEN 'DH'
      WHEN NEW.currency_code = 'CAD' THEN 'C$'
      WHEN NEW.currency_code = 'AUD' THEN 'A$'
      WHEN NEW.currency_code = 'BRL' THEN 'R$'
      ELSE NEW.currency_code
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync currency symbols
DROP TRIGGER IF EXISTS sync_currency_symbol_trigger ON business_settings;
CREATE TRIGGER sync_currency_symbol_trigger
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_currency_symbol_on_code_change();