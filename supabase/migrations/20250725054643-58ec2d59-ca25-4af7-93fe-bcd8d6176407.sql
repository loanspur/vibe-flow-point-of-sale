-- Continue fixing functions - Batch 2

-- Function 5: update_product_stock
CREATE OR REPLACE FUNCTION public.update_product_stock(product_id uuid, quantity_sold integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.products 
  SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
  WHERE id = product_id;
END;
$function$;

-- Function 6: update_variant_stock
CREATE OR REPLACE FUNCTION public.update_variant_stock(variant_id uuid, quantity_sold integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.product_variants 
  SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
  WHERE id = variant_id;
END;
$function$;

-- Function 7: get_account_balance
CREATE OR REPLACE FUNCTION public.get_account_balance(account_id_param uuid, as_of_date date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  balance_result NUMERIC DEFAULT 0;
BEGIN
  SELECT 
    COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0)
  INTO balance_result
  FROM public.accounting_entries ae
  JOIN public.accounting_transactions at ON ae.transaction_id = at.id
  WHERE ae.account_id = account_id_param
    AND at.transaction_date <= as_of_date
    AND at.is_posted = true;
    
  RETURN COALESCE(balance_result, 0);
END;
$function$;

-- Function 8: update_account_balances_from_entries
CREATE OR REPLACE FUNCTION public.update_account_balances_from_entries()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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