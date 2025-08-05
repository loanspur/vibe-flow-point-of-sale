-- Update tenants with active subscriptions to active status
UPDATE tenants 
SET 
  status = 'active',
  updated_at = now()
WHERE id IN (
  SELECT t.id 
  FROM tenants t
  JOIN tenant_subscription_details tsd ON t.id = tsd.tenant_id
  WHERE tsd.status = 'active' 
  AND t.status != 'active'
);

-- Tenants with pending subscriptions but no valid trial should remain as 'trial' 
-- since 'pending' is not a valid tenant status
-- This way they still get basic access while their subscription is being processed

-- Log the status update for transparency
SELECT 
  t.id,
  t.name,
  t.status as current_tenant_status,
  tsd.status as subscription_status,
  tsd.trial_end,
  CASE 
    WHEN tsd.status = 'active' THEN 'active'
    ELSE 'trial'
  END as should_be_status
FROM tenants t
LEFT JOIN tenant_subscription_details tsd ON t.id = tsd.tenant_id
WHERE t.status IN ('trial', 'active')
ORDER BY t.name;