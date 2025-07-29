-- Function to record cash transaction with accounting integration
CREATE OR REPLACE FUNCTION public.record_cash_transaction_with_accounting(
  drawer_id_param UUID,
  transaction_type_param TEXT,
  amount_param NUMERIC,
  description_param TEXT,
  reference_type_param TEXT DEFAULT NULL,
  reference_id_param UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  drawer_record RECORD;
  new_balance NUMERIC;
  transaction_id UUID;
  accounting_transaction_id UUID;
  cash_account_id UUID;
  contra_account_id UUID;
  transaction_number TEXT;
BEGIN
  -- Get drawer details
  SELECT * INTO drawer_record FROM public.cash_drawers WHERE id = drawer_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash drawer not found';
  END IF;
  
  -- Calculate new balance
  new_balance := drawer_record.current_balance + amount_param;
  
  -- Record cash transaction
  INSERT INTO public.cash_transactions (
    tenant_id, cash_drawer_id, transaction_type, amount, balance_after,
    reference_type, reference_id, description, performed_by
  ) VALUES (
    drawer_record.tenant_id, drawer_id_param, transaction_type_param, 
    amount_param, new_balance, reference_type_param, reference_id_param,
    description_param, auth.uid()
  ) RETURNING id INTO transaction_id;
  
  -- Update drawer balance
  UPDATE public.cash_drawers
  SET 
    current_balance = new_balance,
    updated_at = now()
  WHERE id = drawer_id_param;
  
  -- Find Cash account
  SELECT id INTO cash_account_id 
  FROM public.accounts 
  WHERE tenant_id = drawer_record.tenant_id 
    AND code = '1010' 
    AND name = 'Cash'
  LIMIT 1;
  
  -- Create accounting transaction if Cash account exists
  IF cash_account_id IS NOT NULL THEN
    -- Generate transaction number
    transaction_number := 'CSH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((
      SELECT COUNT(*) + 1 
      FROM accounting_transactions 
      WHERE tenant_id = drawer_record.tenant_id
        AND DATE(created_at) = CURRENT_DATE
    )::TEXT, 4, '0');
    
    -- Create accounting transaction
    INSERT INTO public.accounting_transactions (
      tenant_id, transaction_number, description, total_amount,
      reference_type, reference_id, created_by, is_posted
    ) VALUES (
      drawer_record.tenant_id, transaction_number, 
      'Cash Drawer: ' || description_param, ABS(amount_param),
      'cash_transaction', transaction_id, auth.uid(), true
    ) RETURNING id INTO accounting_transaction_id;
    
    -- Determine contra account based on transaction type
    CASE transaction_type_param
      WHEN 'sale_payment' THEN
        -- Find Sales Revenue account
        SELECT id INTO contra_account_id 
        FROM public.accounts 
        WHERE tenant_id = drawer_record.tenant_id 
          AND code = '4010' 
          AND name = 'Sales Revenue'
        LIMIT 1;
      WHEN 'change_issued' THEN
        -- Use Sales Revenue account (reducing revenue)
        SELECT id INTO contra_account_id 
        FROM public.accounts 
        WHERE tenant_id = drawer_record.tenant_id 
          AND code = '4010' 
          AND name = 'Sales Revenue'
        LIMIT 1;
      WHEN 'bank_deposit' THEN
        -- Find Bank account or create generic asset account
        SELECT id INTO contra_account_id 
        FROM public.accounts 
        WHERE tenant_id = drawer_record.tenant_id 
          AND (name LIKE '%Bank%' OR code LIKE '10%')
          AND id != cash_account_id
        LIMIT 1;
      WHEN 'expense_payment' THEN
        -- Find COGS or expense account
        SELECT id INTO contra_account_id 
        FROM public.accounts 
        WHERE tenant_id = drawer_record.tenant_id 
          AND code = '5010' 
          AND name = 'Cost of Goods Sold'
        LIMIT 1;
      ELSE
        -- Default to Owner Equity for other transactions
        SELECT id INTO contra_account_id 
        FROM public.accounts 
        WHERE tenant_id = drawer_record.tenant_id 
          AND code = '3010' 
          AND name = 'Owner Equity'
        LIMIT 1;
    END CASE;
    
    -- Create accounting entries
    IF amount_param > 0 THEN
      -- Cash increases (Debit Cash, Credit Contra Account)
      INSERT INTO public.accounting_entries (
        transaction_id, account_id, debit_amount, credit_amount, description
      ) VALUES 
      (accounting_transaction_id, cash_account_id, amount_param, 0, description_param),
      (accounting_transaction_id, COALESCE(contra_account_id, cash_account_id), 0, amount_param, description_param);
    ELSE
      -- Cash decreases (Credit Cash, Debit Contra Account)
      INSERT INTO public.accounting_entries (
        transaction_id, account_id, debit_amount, credit_amount, description
      ) VALUES 
      (accounting_transaction_id, COALESCE(contra_account_id, cash_account_id), ABS(amount_param), 0, description_param),
      (accounting_transaction_id, cash_account_id, 0, ABS(amount_param), description_param);
    END IF;
  END IF;
  
  RETURN transaction_id;
END;
$$;

-- Function to sync cash drawer balance with accounting cash account
CREATE OR REPLACE FUNCTION public.sync_cash_drawer_with_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cash_account_id UUID;
  total_cash_balance NUMERIC;
BEGIN
  -- Find Cash account
  SELECT id INTO cash_account_id 
  FROM public.accounts 
  WHERE tenant_id = NEW.tenant_id 
    AND code = '1010' 
    AND name = 'Cash'
  LIMIT 1;
  
  -- Update cash account balance if it exists
  IF cash_account_id IS NOT NULL THEN
    -- Calculate total cash balance from all drawers
    SELECT COALESCE(SUM(current_balance), 0) INTO total_cash_balance
    FROM public.cash_drawers 
    WHERE tenant_id = NEW.tenant_id 
      AND is_active = true;
    
    -- Update the cash account balance
    UPDATE public.accounts 
    SET balance = total_cash_balance, updated_at = now()
    WHERE id = cash_account_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync cash account balance when drawer balance changes
CREATE TRIGGER sync_cash_account_balance
  AFTER UPDATE OF current_balance ON public.cash_drawers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cash_drawer_with_accounting();