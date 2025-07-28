-- Update the next billing date to align with the 1st of the month billing cycle
UPDATE tenant_subscription_details 
SET 
  next_billing_date = '2025-08-01',
  current_period_end = '2025-08-01',
  updated_at = now()
WHERE tenant_id = '3ee42812-de3a-4125-ac20-36e46e8c2182'
  AND billing_day = 1;