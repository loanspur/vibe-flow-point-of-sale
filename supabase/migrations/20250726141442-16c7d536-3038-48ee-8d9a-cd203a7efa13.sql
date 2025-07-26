-- Fix remaining function search path issues (batch 4)

-- Fix calculate_purchase_total function
CREATE OR REPLACE FUNCTION public.calculate_purchase_total(purchase_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  total_amount DECIMAL DEFAULT 0;
BEGIN
  SELECT COALESCE(SUM(total_cost), 0)
  INTO total_amount
  FROM public.purchase_items
  WHERE purchase_id = purchase_id_param;
  
  RETURN total_amount;
END;
$function$;

-- Fix update_purchase_total function
CREATE OR REPLACE FUNCTION public.update_purchase_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.purchases
  SET total_amount = public.calculate_purchase_total(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.purchase_id
      ELSE NEW.purchase_id
    END
  )
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.purchase_id
    ELSE NEW.purchase_id
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix update_payment_status function
CREATE OR REPLACE FUNCTION public.update_payment_status(reference_param text, status_param text, metadata_param jsonb DEFAULT NULL::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.payment_history 
  SET 
    payment_status = status_param,
    updated_at = now(),
    paid_at = CASE WHEN status_param = 'completed' THEN now() ELSE paid_at END,
    failed_at = CASE WHEN status_param = 'failed' THEN now() ELSE failed_at END,
    metadata = CASE WHEN metadata_param IS NOT NULL THEN metadata_param ELSE metadata END
  WHERE payment_reference = reference_param;
  
  RETURN FOUND;
END;
$function$;

-- Fix update_account_balances_from_entries function
CREATE OR REPLACE FUNCTION public.update_account_balances_from_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update account balances based on accounting entries
  UPDATE public.accounts 
  SET balance = COALESCE(calculated_balance.new_balance, 0)
  FROM (
    SELECT 
      ae.account_id,
      SUM(ae.debit_amount - ae.credit_amount) as new_balance
    FROM public.accounting_entries ae
    JOIN public.accounting_transactions at ON ae.transaction_id = at.id
    WHERE at.is_posted = true
    GROUP BY ae.account_id
  ) as calculated_balance
  WHERE accounts.id = calculated_balance.account_id;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;