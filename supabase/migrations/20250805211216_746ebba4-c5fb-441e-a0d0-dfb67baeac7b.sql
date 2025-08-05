-- Remove prorating for first payment - always charge full amount regardless of start date
CREATE OR REPLACE FUNCTION public.setup_monthly_billing_cycle(
  tenant_id_param uuid, 
  billing_plan_id_param uuid, 
  start_date_param date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  billing_amount numeric, 
  is_prorated boolean, 
  next_billing_date date, 
  billing_period_start date, 
  billing_period_end date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  plan_price NUMERIC;
  billing_start DATE;
  billing_end DATE;
  next_billing DATE;
BEGIN
  -- Get plan price
  SELECT price INTO plan_price
  FROM billing_plans 
  WHERE id = billing_plan_id_param AND is_active = true;
  
  IF plan_price IS NULL THEN
    RAISE EXCEPTION 'Invalid billing plan';
  END IF;
  
  -- Always charge full amount for first payment (no prorating)
  -- Set billing period from start date to next billing cycle
  billing_start := start_date_param;
  next_billing := calculate_next_billing_date(start_date_param);
  billing_end := next_billing - INTERVAL '1 day';
  
  RETURN QUERY SELECT 
    plan_price,        -- Always full amount
    false,             -- Never prorated
    next_billing,      -- Next billing date
    billing_start,     -- Current period start
    billing_end;       -- Current period end
END;
$function$;