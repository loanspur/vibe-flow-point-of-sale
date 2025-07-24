-- Update existing tenant subscriptions to have 14-day trial period instead of 30 days
UPDATE public.tenant_subscriptions 
SET expires_at = started_at + interval '14 days'
WHERE status = 'active' 
  AND reference LIKE 'default-%'
  AND expires_at = started_at + interval '30 days';