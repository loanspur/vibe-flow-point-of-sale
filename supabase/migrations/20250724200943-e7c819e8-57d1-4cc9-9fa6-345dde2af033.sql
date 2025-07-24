-- Add fields to support monthly billing cycle standardization
ALTER TABLE billing_plans 
ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS allows_prorating BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS proration_policy TEXT DEFAULT 'daily';

-- Add fields to payment_history for prorated billing tracking
ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS is_prorated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prorated_days INTEGER,
ADD COLUMN IF NOT EXISTS full_period_amount NUMERIC,
ADD COLUMN IF NOT EXISTS proration_start_date DATE,
ADD COLUMN IF NOT EXISTS proration_end_date DATE;

-- Add fields to tenant_subscription_details for billing cycle management
ALTER TABLE tenant_subscription_details 
ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS next_billing_amount NUMERIC,
ADD COLUMN IF NOT EXISTS is_prorated_period BOOLEAN DEFAULT false;

-- Create function to calculate next billing date on the 1st
CREATE OR REPLACE FUNCTION calculate_next_billing_date(start_date DATE)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  next_month_first DATE;
BEGIN
  -- Get the first day of next month
  next_month_first := DATE_TRUNC('month', start_date + INTERVAL '1 month');
  RETURN next_month_first;
END;
$$;

-- Create function to calculate prorated amount
CREATE OR REPLACE FUNCTION calculate_prorated_amount(
  full_amount NUMERIC, 
  start_date DATE, 
  billing_day INTEGER DEFAULT 1
)
RETURNS TABLE(
  prorated_amount NUMERIC,
  days_in_period INTEGER,
  total_days_in_month INTEGER,
  next_billing_date DATE
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  current_month_first DATE;
  next_billing_date_calc DATE;
  days_remaining INTEGER;
  total_days INTEGER;
  calculated_amount NUMERIC;
BEGIN
  -- Get first day of current month
  current_month_first := DATE_TRUNC('month', start_date);
  
  -- Calculate next billing date (1st of next month)
  next_billing_date_calc := calculate_next_billing_date(start_date);
  
  -- Calculate days from start_date to next billing date
  days_remaining := next_billing_date_calc - start_date;
  
  -- Get total days in the current month
  total_days := EXTRACT(DAY FROM (current_month_first + INTERVAL '1 month' - INTERVAL '1 day'));
  
  -- Calculate prorated amount
  calculated_amount := (full_amount * days_remaining) / total_days;
  
  RETURN QUERY SELECT 
    calculated_amount,
    days_remaining,
    total_days,
    next_billing_date_calc;
END;
$$;

-- Create function to handle billing cycle management
CREATE OR REPLACE FUNCTION setup_monthly_billing_cycle(
  tenant_id_param UUID,
  billing_plan_id_param UUID,
  start_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  billing_amount NUMERIC,
  is_prorated BOOLEAN,
  next_billing_date DATE,
  billing_period_start DATE,
  billing_period_end DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_price NUMERIC;
  proration_result RECORD;
  billing_start DATE;
  billing_end DATE;
  is_first_billing BOOLEAN;
BEGIN
  -- Get plan price
  SELECT price INTO plan_price
  FROM billing_plans 
  WHERE id = billing_plan_id_param AND is_active = true;
  
  IF plan_price IS NULL THEN
    RAISE EXCEPTION 'Invalid billing plan';
  END IF;
  
  -- Check if this is first billing (prorated)
  is_first_billing := EXTRACT(DAY FROM start_date_param) != 1;
  
  IF is_first_billing THEN
    -- Calculate prorated billing
    SELECT * INTO proration_result 
    FROM calculate_prorated_amount(plan_price, start_date_param, 1);
    
    billing_start := start_date_param;
    billing_end := proration_result.next_billing_date - INTERVAL '1 day';
    
    RETURN QUERY SELECT 
      proration_result.prorated_amount,
      true,
      proration_result.next_billing_date,
      billing_start,
      billing_end;
  ELSE
    -- Regular monthly billing (starting on 1st)
    billing_start := start_date_param;
    billing_end := calculate_next_billing_date(start_date_param) - INTERVAL '1 day';
    
    RETURN QUERY SELECT 
      plan_price,
      false,
      calculate_next_billing_date(start_date_param),
      billing_start,
      billing_end;
  END IF;
END;
$$;