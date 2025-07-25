-- Continue fixing functions - Batch 3

-- Function 9: trigger_update_account_balance
CREATE OR REPLACE FUNCTION public.trigger_update_account_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  account_id_to_update UUID;
  transaction_posted BOOLEAN;
BEGIN
  -- Determine which account to update
  IF TG_OP = 'DELETE' then
    account_id_to_update := OLD.account_id;
  ELSE
    account_id_to_update := NEW.account_id;
  END IF;
  
  -- Check if the transaction is posted
  SELECT is_posted INTO transaction_posted 
  FROM public.accounting_transactions 
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  -- Only update balance if transaction is posted
  IF transaction_posted THEN
    -- Update the specific account balance
    UPDATE public.accounts 
    SET balance = COALESCE((
      SELECT SUM(ae.debit_amount - ae.credit_amount)
      FROM public.accounting_entries ae
      JOIN public.accounting_transactions at ON ae.transaction_id = at.id
      WHERE ae.account_id = account_id_to_update
        AND at.is_posted = true
    ), 0)
    WHERE id = account_id_to_update;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function 10: calculate_profit_loss
CREATE OR REPLACE FUNCTION public.calculate_profit_loss(tenant_id_param uuid, start_date_param date, end_date_param date)
 RETURNS TABLE(income numeric, expenses numeric, profit_loss numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  total_income NUMERIC DEFAULT 0;
  total_expenses NUMERIC DEFAULT 0;
BEGIN
  -- Calculate total income
  SELECT COALESCE(SUM(ae.credit_amount - ae.debit_amount), 0)
  INTO total_income
  FROM public.accounting_entries ae
  JOIN public.accounting_transactions at ON ae.transaction_id = at.id
  JOIN public.accounts a ON ae.account_id = a.id
  JOIN public.account_types act ON a.account_type_id = act.id
  WHERE at.tenant_id = tenant_id_param
    AND at.transaction_date BETWEEN start_date_param AND end_date_param
    AND at.is_posted = true
    AND act.category = 'income';

  -- Calculate total expenses
  SELECT COALESCE(SUM(ae.debit_amount - ae.credit_amount), 0)
  INTO total_expenses
  FROM public.accounting_entries ae
  JOIN public.accounting_transactions at ON ae.transaction_id = at.id
  JOIN public.accounts a ON ae.account_id = a.id
  JOIN public.account_types act ON a.account_type_id = act.id
  WHERE at.tenant_id = tenant_id_param
    AND at.transaction_date BETWEEN start_date_param AND end_date_param
    AND at.is_posted = true
    AND act.category = 'expenses';

  RETURN QUERY SELECT total_income, total_expenses, (total_income - total_expenses);
END;
$function$;