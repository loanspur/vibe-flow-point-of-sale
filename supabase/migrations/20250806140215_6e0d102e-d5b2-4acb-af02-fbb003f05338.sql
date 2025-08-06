-- Ensure all Enterprise plan tenants have advanced_notifications feature enabled
-- First, add the feature for all current Enterprise plan tenants
INSERT INTO tenant_feature_access (tenant_id, feature_name, is_enabled, expires_at)
SELECT DISTINCT 
  tsd.tenant_id,
  'advanced_notifications' as feature_name,
  true as is_enabled,
  NULL as expires_at
FROM tenant_subscription_details tsd
JOIN billing_plans bp ON tsd.billing_plan_id = bp.id
WHERE bp.name = 'Enterprise' 
  AND bp.is_active = true
  AND tsd.status IN ('active', 'trial')
  AND NOT EXISTS (
    SELECT 1 FROM tenant_feature_access tfa 
    WHERE tfa.tenant_id = tsd.tenant_id 
    AND tfa.feature_name = 'advanced_notifications'
  )
ON CONFLICT (tenant_id, feature_name) DO UPDATE SET
  is_enabled = true,
  expires_at = NULL,
  updated_at = now();