-- Fix final batch of remaining function search path issues

-- Fix sync_tenant_users_profile function
CREATE OR REPLACE FUNCTION public.sync_tenant_users_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When a tenant_users entry is created, ensure profile has the tenant_id
  UPDATE profiles 
  SET tenant_id = NEW.tenant_id,
      role = CASE 
        WHEN NEW.role = 'owner' THEN 'admin'
        WHEN NEW.role = 'admin' THEN 'admin'
        WHEN NEW.role = 'manager' THEN 'manager'
        ELSE 'user'
      END::user_role,
      updated_at = now()
  WHERE user_id = NEW.user_id 
    AND (tenant_id IS NULL OR tenant_id != NEW.tenant_id);
    
  RETURN NEW;
END;
$function$;

-- Fix trigger_update_all_affected_account_balances function
CREATE OR REPLACE FUNCTION public.trigger_update_all_affected_account_balances()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
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

-- Fix trigger_update_account_balance function
CREATE OR REPLACE FUNCTION public.trigger_update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
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

-- Fix update_ar_ap_outstanding_amount function
CREATE OR REPLACE FUNCTION public.update_ar_ap_outstanding_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update outstanding amount when payment is added
    IF NEW.payment_type = 'receivable' THEN
      UPDATE public.accounts_receivable 
      SET 
        paid_amount = paid_amount + NEW.amount,
        outstanding_amount = original_amount - (paid_amount + NEW.amount),
        status = CASE 
          WHEN (paid_amount + NEW.amount) >= original_amount THEN 'paid'
          WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'
          ELSE 'outstanding'
        END,
        updated_at = now()
      WHERE id = NEW.reference_id;
    ELSIF NEW.payment_type = 'payable' THEN
      UPDATE public.accounts_payable 
      SET 
        paid_amount = paid_amount + NEW.amount,
        outstanding_amount = original_amount - (paid_amount + NEW.amount),
        status = CASE 
          WHEN (paid_amount + NEW.amount) >= original_amount THEN 'paid'
          WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'
          ELSE 'outstanding'
        END,
        updated_at = now()
      WHERE id = NEW.reference_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Fix generate_invitation_token function
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$function$;

-- Fix generate_domain_verification_token function
CREATE OR REPLACE FUNCTION public.generate_domain_verification_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  RETURN 'vibepos-verify-' || encode(gen_random_bytes(16), 'hex');
END;
$function$;

-- Fix calculate_next_billing_date function
CREATE OR REPLACE FUNCTION public.calculate_next_billing_date(start_date date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
DECLARE
  next_month_first DATE;
BEGIN
  -- Get the first day of next month
  next_month_first := DATE_TRUNC('month', start_date + INTERVAL '1 month');
  RETURN next_month_first;
END;
$function$;