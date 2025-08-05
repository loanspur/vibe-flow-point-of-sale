-- Update the setup_monthly_billing_cycle function for proper proration
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
AS $$
DECLARE
  plan_price NUMERIC;
  billing_start DATE;
  billing_end DATE;
  next_billing DATE;
  days_remaining INTEGER;
  days_in_month INTEGER;
  prorated_amount NUMERIC;
  is_first_payment BOOLEAN;
BEGIN
  -- Get plan price
  SELECT price INTO plan_price
  FROM billing_plans 
  WHERE id = billing_plan_id_param AND is_active = true;
  
  IF plan_price IS NULL THEN
    RAISE EXCEPTION 'Invalid billing plan';
  END IF;
  
  -- Check if this is the first payment for this tenant
  SELECT NOT EXISTS (
    SELECT 1 FROM tenant_subscription_details 
    WHERE tenant_id = tenant_id_param
  ) INTO is_first_payment;
  
  billing_start := start_date_param;
  
  IF is_first_payment THEN
    -- For first payment, prorate to end of month
    billing_end := DATE_TRUNC('month', start_date_param) + INTERVAL '1 month' - INTERVAL '1 day';
    next_billing := DATE_TRUNC('month', start_date_param) + INTERVAL '1 month';
    
    -- Calculate prorated amount
    days_remaining := EXTRACT(DAY FROM billing_end) - EXTRACT(DAY FROM start_date_param) + 1;
    days_in_month := EXTRACT(DAY FROM billing_end);
    
    -- Calculate prorated amount and round to whole number
    prorated_amount := ROUND((plan_price * days_remaining) / days_in_month);
    
    RETURN QUERY SELECT 
      prorated_amount,
      true,  -- is_prorated
      next_billing,
      billing_start,
      billing_end;
  ELSE
    -- For subsequent payments, charge full amount for the month
    next_billing := calculate_next_billing_date(start_date_param);
    billing_end := next_billing - INTERVAL '1 day';
    
    RETURN QUERY SELECT 
      ROUND(plan_price),  -- Ensure whole number
      false,  -- is_prorated
      next_billing,
      billing_start,
      billing_end;
  END IF;
END;
$$;

-- Create or update the calculate_next_billing_date function
CREATE OR REPLACE FUNCTION public.calculate_next_billing_date(input_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Always return the 1st of the next month
  RETURN DATE_TRUNC('month', input_date) + INTERVAL '1 month';
END;
$$;

-- Create or update calculate_prorated_amount function  
CREATE OR REPLACE FUNCTION public.calculate_prorated_amount(
  full_amount numeric, 
  start_date date, 
  billing_day integer DEFAULT 1
)
RETURNS TABLE(
  prorated_amount numeric, 
  days_in_period integer, 
  total_days_in_month integer
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  month_end date;
  days_remaining integer;
  days_in_month integer;
  calculated_amount numeric;
BEGIN
  -- Calculate end of the month
  month_end := DATE_TRUNC('month', start_date) + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Calculate days from start_date to end of month (inclusive)
  days_remaining := EXTRACT(DAY FROM month_end) - EXTRACT(DAY FROM start_date) + 1;
  days_in_month := EXTRACT(DAY FROM month_end);
  
  -- Calculate prorated amount and round to whole number
  calculated_amount := ROUND((full_amount * days_remaining) / days_in_month);
  
  RETURN QUERY SELECT 
    calculated_amount,
    days_remaining,
    days_in_month;
END;
$$;