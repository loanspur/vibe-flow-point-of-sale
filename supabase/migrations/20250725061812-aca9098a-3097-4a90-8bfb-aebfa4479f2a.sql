-- Update existing billing plans to include max products feature
UPDATE billing_plans 
SET features = features || '[{"name": "Up to 500 Products", "included": true, "limit": "500"}]'::jsonb
WHERE name = 'Starter' AND NOT (features @> '[{"name": "Up to 500 Products"}]'::jsonb);

UPDATE billing_plans 
SET features = features || '[{"name": "Up to 5,000 Products", "included": true, "limit": "5000"}]'::jsonb
WHERE name = 'Professional' AND NOT (features @> '[{"name": "Up to 5,000 Products"}]'::jsonb);

UPDATE billing_plans 
SET features = features || '[{"name": "Unlimited Products", "included": true, "limit": "unlimited"}]'::jsonb
WHERE name = 'Enterprise' AND NOT (features @> '[{"name": "Unlimited Products"}]'::jsonb);