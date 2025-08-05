-- Update subscription status for tenants with active trials
UPDATE tenant_subscription_details 
SET status = 'trial',
    updated_at = now()
WHERE status = 'pending' 
  AND trial_end IS NOT NULL 
  AND trial_end > CURRENT_DATE;

-- Add a function to get the effective subscription status
CREATE OR REPLACE FUNCTION public.get_effective_subscription_status(
  subscription_status text,
  trial_end date
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If trial is active, status should be 'trial' regardless of stored status
  IF trial_end IS NOT NULL AND trial_end > CURRENT_DATE THEN
    RETURN 'trial';
  END IF;
  
  -- If trial has ended, return the stored status
  RETURN subscription_status;
END;
$$;