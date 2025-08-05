-- Update tenant statuses based on subscription and trial data
UPDATE tenants 
SET 
  status = 'trial',
  updated_at = now()
WHERE id = '3ee42812-de3a-4125-ac20-36e46e8c2182' -- Santalama Limited (has valid trial_end)
AND status != 'trial';

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

-- Update tenants with pending subscriptions and no valid trial to pending status
UPDATE tenants 
SET 
  status = 'pending',
  updated_at = now()
WHERE id IN (
  SELECT t.id 
  FROM tenants t
  JOIN tenant_subscription_details tsd ON t.id = tsd.tenant_id
  WHERE tsd.status = 'pending' 
  AND (tsd.trial_end IS NULL OR tsd.trial_end <= CURRENT_DATE)
  AND t.status != 'pending'
);