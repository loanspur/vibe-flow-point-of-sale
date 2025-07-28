-- Update Walela's Enterprise features to expire in 14 days instead of 1 year
UPDATE tenant_feature_access 
SET expires_at = CURRENT_DATE + INTERVAL '14 days',
    updated_at = NOW()
WHERE tenant_id = '24cf2d8c-7a7d-4d23-9999-de65800620ff';

-- Also update the subscription period to reflect 14-day trial
UPDATE tenant_subscription_details 
SET current_period_end = CURRENT_DATE + INTERVAL '14 days',
    next_billing_date = CURRENT_DATE + INTERVAL '14 days',
    status = 'trialing',
    updated_at = NOW()
WHERE tenant_id = '24cf2d8c-7a7d-4d23-9999-de65800620ff';