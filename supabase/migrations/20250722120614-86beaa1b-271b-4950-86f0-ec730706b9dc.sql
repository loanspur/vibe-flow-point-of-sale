-- Create a function to update account balances from journal entries
CREATE OR REPLACE FUNCTION public.update_account_balances_from_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create a trigger function to automatically update account balances when entries are added/modified
CREATE OR REPLACE FUNCTION public.trigger_update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
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

-- Create trigger on accounting_entries to auto-update account balances
DROP TRIGGER IF EXISTS trigger_update_account_balance_on_entry ON public.accounting_entries;
CREATE TRIGGER trigger_update_account_balance_on_entry
  AFTER INSERT OR UPDATE OR DELETE ON public.accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_account_balance();

-- Create a trigger function for when transaction posting status changes
CREATE OR REPLACE FUNCTION public.trigger_update_all_affected_account_balances()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When a transaction is posted or unposted, update all affected account balances
  IF OLD.is_posted != NEW.is_posted THEN
    UPDATE public.accounts 
    SET balance = COALESCE((
      SELECT SUM(ae.debit_amount - ae.credit_amount)
      FROM public.accounting_entries ae
      JOIN public.accounting_transactions at ON ae.transaction_id = at.id
      WHERE ae.account_id = accounts.id
        AND at.is_posted = true
    ), 0)
    WHERE id IN (
      SELECT DISTINCT ae.account_id 
      FROM public.accounting_entries ae 
      WHERE ae.transaction_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on accounting_transactions for posting status changes
DROP TRIGGER IF EXISTS trigger_update_balances_on_posting ON public.accounting_transactions;
CREATE TRIGGER trigger_update_balances_on_posting
  AFTER UPDATE OF is_posted ON public.accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_all_affected_account_balances();

-- Initial sync: Update all account balances from existing entries
SELECT public.update_account_balances_from_entries();