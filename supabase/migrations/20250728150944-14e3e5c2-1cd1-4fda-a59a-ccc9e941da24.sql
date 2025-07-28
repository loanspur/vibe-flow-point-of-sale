-- Final Security Fix: Complete search_path fixes for remaining functions
-- Address the remaining 4 functions that need SET search_path TO 'public'

-- Fix calculate_prorated_amount function
CREATE OR REPLACE FUNCTION public.calculate_prorated_amount(full_amount numeric, start_date date, billing_day integer DEFAULT 1)
RETURNS TABLE(prorated_amount numeric, days_in_period integer, total_days_in_month integer, next_billing_date date)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix calculate_next_billing_date function
CREATE OR REPLACE FUNCTION public.calculate_next_billing_date(start_date date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_month_first DATE;
BEGIN
  -- Get the first day of next month
  next_month_first := DATE_TRUNC('month', start_date + INTERVAL '1 month');
  RETURN next_month_first;
END;
$function$;

-- Fix is_promotion_valid function
CREATE OR REPLACE FUNCTION public.is_promotion_valid(promotion_id_param uuid, current_time_param timestamp with time zone DEFAULT now(), purchase_amount_param numeric DEFAULT 0, customer_type_param text DEFAULT 'all'::text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  promo RECORD;
  current_day INTEGER;
  current_time_only TIME;
BEGIN
  -- Get promotion details
  SELECT * INTO promo FROM public.promotions WHERE id = promotion_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if promotion is active
  IF promo.status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Check date range
  IF current_time_param < promo.start_date THEN
    RETURN FALSE;
  END IF;
  
  IF promo.end_date IS NOT NULL AND current_time_param > promo.end_date THEN
    RETURN FALSE;
  END IF;
  
  -- Check usage limit
  IF promo.max_usage_count IS NOT NULL AND promo.current_usage_count >= promo.max_usage_count THEN
    RETURN FALSE;
  END IF;
  
  -- Check minimum purchase amount
  IF promo.min_purchase_amount IS NOT NULL AND purchase_amount_param < promo.min_purchase_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Check customer type
  IF promo.customer_type IS NOT NULL AND promo.customer_type != 'all' AND promo.customer_type != customer_type_param THEN
    RETURN FALSE;
  END IF;
  
  -- Check day of week
  IF promo.days_of_week IS NOT NULL THEN
    current_day := EXTRACT(DOW FROM current_time_param);
    IF NOT (promo.days_of_week ? current_day::text) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check time range
  IF promo.time_start IS NOT NULL AND promo.time_end IS NOT NULL THEN
    current_time_only := current_time_param::TIME;
    IF current_time_only < promo.time_start OR current_time_only > promo.time_end THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix calculate_promotion_discount function
CREATE OR REPLACE FUNCTION public.calculate_promotion_discount(promotion_id_param uuid, item_price_param numeric, item_quantity_param integer DEFAULT 1, total_amount_param numeric DEFAULT 0)
RETURNS TABLE(discount_amount numeric, affected_quantity integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  promo RECORD;
  calculated_discount NUMERIC DEFAULT 0;
  calculated_quantity INTEGER DEFAULT 0;
BEGIN
  -- Get promotion details
  SELECT * INTO promo FROM public.promotions WHERE id = promotion_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;
  
  CASE promo.type
    WHEN 'percentage' THEN
      calculated_discount := (item_price_param * item_quantity_param) * (promo.discount_percentage / 100);
      calculated_quantity := item_quantity_param;
      
    WHEN 'fixed_amount' THEN
      calculated_discount := LEAST(promo.discount_amount, item_price_param * item_quantity_param);
      calculated_quantity := item_quantity_param;
      
    WHEN 'bogo' THEN
      IF item_quantity_param >= promo.buy_quantity THEN
        calculated_quantity := (item_quantity_param / promo.buy_quantity) * promo.get_quantity;
        calculated_discount := calculated_quantity * item_price_param;
      END IF;
      
    WHEN 'bulk_pricing' THEN
      IF item_quantity_param >= promo.min_quantity AND 
         (promo.max_quantity IS NULL OR item_quantity_param <= promo.max_quantity) THEN
        IF promo.discount_percentage IS NOT NULL THEN
          calculated_discount := (item_price_param * item_quantity_param) * (promo.discount_percentage / 100);
        ELSIF promo.discount_amount IS NOT NULL THEN
          calculated_discount := promo.discount_amount * item_quantity_param;
        END IF;
        calculated_quantity := item_quantity_param;
      END IF;
  END CASE;
  
  RETURN QUERY SELECT calculated_discount, calculated_quantity;
END;
$function$;