-- Replace KSh with KES throughout the system for consistency
-- Update business settings to use KES instead of KSh
UPDATE business_settings 
SET currency_symbol = 'KES'
WHERE currency_symbol = 'KSh' OR currency_symbol = 'KSH' OR currency_symbol = 'Ksh';

-- Update any other tables that might have KSh references
-- Check if there are any hardcoded KSh values in metadata or description fields
UPDATE billing_plans 
SET metadata = replace(metadata::text, 'KSh', 'KES')::jsonb
WHERE metadata::text LIKE '%KSh%';

UPDATE billing_plans 
SET description = replace(description, 'KSh', 'KES')
WHERE description LIKE '%KSh%';

-- Update payment history if any descriptions contain KSh
UPDATE payment_history 
SET description = replace(description, 'KSh', 'KES')
WHERE description LIKE '%KSh%';

-- Update product pricing if any contain KSh
UPDATE products 
SET metadata = replace(metadata::text, 'KSh', 'KES')::jsonb
WHERE metadata::text LIKE '%KSh%';

-- Update sales and purchase records if any contain KSh references
UPDATE sales 
SET notes = replace(notes, 'KSh', 'KES')
WHERE notes LIKE '%KSh%';

UPDATE purchases 
SET notes = replace(notes, 'KSh', 'KES')
WHERE notes LIKE '%KSh%';