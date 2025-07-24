-- Replace KSh with KES throughout the system for consistency
-- Update business settings to use KES instead of KSh
UPDATE business_settings 
SET currency_symbol = 'KES'
WHERE currency_symbol = 'KSh' OR currency_symbol = 'KSH' OR currency_symbol = 'Ksh';

-- Update billing plans description if any contain KSh
UPDATE billing_plans 
SET description = replace(description, 'KSh', 'KES')
WHERE description LIKE '%KSh%';

-- Update payment history if any descriptions contain KSh
UPDATE payment_history 
SET notes = replace(notes, 'KSh', 'KES')
WHERE notes LIKE '%KSh%';

-- Update sales notes if any contain KSh references
UPDATE sales 
SET notes = replace(notes, 'KSh', 'KES')
WHERE notes LIKE '%KSh%';

-- Update purchases notes if any contain KSh references
UPDATE purchases 
SET notes = replace(notes, 'KSh', 'KES')
WHERE notes LIKE '%KSh%';