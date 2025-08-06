-- Add communications features to the Enterprise plan
UPDATE billing_plans 
SET features = jsonb_set(
  features, 
  '{-1}', 
  '{"name": "Communications Suite", "included": true, "description": "Email campaigns, SMS notifications, WhatsApp integration, and customer communication tools"}'
)
WHERE name = 'Enterprise' AND is_active = true;

-- Also add basic communications to Professional plan but mark as limited
UPDATE billing_plans 
SET features = jsonb_set(
  features, 
  '{-1}', 
  '{"name": "Basic Communications", "included": true, "limit": "email_only", "description": "Email campaigns and basic customer communications"}'
)
WHERE name = 'Professional' AND is_active = true;