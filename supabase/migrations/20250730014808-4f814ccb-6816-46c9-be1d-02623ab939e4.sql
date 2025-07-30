-- First, let's clean up any existing transfer requests that have already been processed
-- and check their current status
UPDATE public.transfer_requests 
SET status = 'completed', completed_at = now()
WHERE transfer_type = 'account' 
  AND status = 'approved' 
  AND EXISTS (
    SELECT 1 FROM public.accounting_transactions 
    WHERE reference_type = 'transfer_request' 
    AND reference_id = transfer_requests.id
  );

-- Update the process_transfer_request function to use better transaction number generation
CREATE OR REPLACE FUNCTION public.process_transfer_request(
  transfer_request_id UUID,
  action TEXT -- 'approve' or 'reject'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  transfer_record RECORD;
  from_drawer_balance NUMERIC;
  to_drawer_balance NUMERIC;
  transaction_number_text TEXT;
  existing_count INTEGER;
BEGIN
  -- Get transfer request details
  SELECT * INTO transfer_record
  FROM public.transfer_requests
  WHERE id = transfer_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer request not found';
  END IF;
  
  -- Only allow processing of pending requests
  IF transfer_record.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer request is not pending';
  END IF;
  
  -- Update the request status
  UPDATE public.transfer_requests
  SET 
    status = CASE WHEN action = 'approve' THEN 'approved' ELSE 'rejected' END,
    responded_at = now(),
    responded_by = auth.uid()
  WHERE id = transfer_request_id;
  
  -- If approved and it's a cash drawer transfer, update the drawer balances
  IF action = 'approve' AND transfer_record.transfer_type = 'cash_drawer' THEN
    -- Update from drawer (subtract amount)
    UPDATE public.cash_drawers
    SET 
      current_balance = current_balance - transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.from_drawer_id;
    
    -- Update to drawer (add amount)
    UPDATE public.cash_drawers
    SET 
      current_balance = current_balance + transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.to_drawer_id;
    
    -- Create cash transactions for both drawers
    INSERT INTO public.cash_transactions (
      tenant_id, cash_drawer_id, transaction_type, amount, balance_after,
      reference_type, reference_id, description, performed_by, transaction_date
    ) VALUES
    -- From drawer transaction (outgoing)
    (
      transfer_record.tenant_id,
      transfer_record.from_drawer_id,
      'transfer_out',
      -transfer_record.amount,
      (SELECT current_balance FROM public.cash_drawers WHERE id = transfer_record.from_drawer_id),
      'transfer_request',
      transfer_record.id,
      'Cash transfer to drawer: ' || transfer_record.reference_number,
      transfer_record.from_user_id,
      now()
    ),
    -- To drawer transaction (incoming)
    (
      transfer_record.tenant_id,
      transfer_record.to_drawer_id,
      'transfer_in',
      transfer_record.amount,
      (SELECT current_balance FROM public.cash_drawers WHERE id = transfer_record.to_drawer_id),
      'transfer_request',
      transfer_record.id,
      'Cash transfer from drawer: ' || transfer_record.reference_number,
      transfer_record.to_user_id,
      now()
    );
  END IF;
  
  -- If approved and it's an account transfer, create accounting entries
  IF action = 'approve' AND transfer_record.transfer_type = 'account' THEN
    -- Get cash account ID
    DECLARE
      cash_account_id UUID;
      transaction_id UUID;
    BEGIN
      -- Find the cash account
      SELECT a.id INTO cash_account_id
      FROM public.accounts a
      JOIN public.account_types at ON a.account_type_id = at.id
      WHERE a.tenant_id = transfer_record.tenant_id
        AND a.code = '1010'
        AND at.category = 'assets';
      
      -- Generate unique transaction number with microseconds
      SELECT COUNT(*) INTO existing_count
      FROM public.accounting_transactions
      WHERE tenant_id = transfer_record.tenant_id
        AND DATE(created_at) = CURRENT_DATE;
      
      transaction_number_text := 'TRF-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((existing_count + 1)::TEXT, 4, '0');
      
      -- Create accounting transaction
      INSERT INTO public.accounting_transactions (
        tenant_id, transaction_number, description, transaction_date,
        total_amount, is_posted, created_by, reference_type, reference_id
      ) VALUES (
        transfer_record.tenant_id,
        transaction_number_text,
        'Cash transfer to ' || transfer_record.reference_number,
        CURRENT_DATE,
        transfer_record.amount,
        true,
        transfer_record.from_user_id,
        'transfer_request',
        transfer_record.id
      ) RETURNING id INTO transaction_id;
      
      -- Create accounting entries (debit destination account, credit cash)
      INSERT INTO public.accounting_entries (
        transaction_id, account_id, debit_amount, credit_amount, description
      ) VALUES
      -- Debit the destination account
      (
        transaction_id,
        transfer_record.to_account_id,
        transfer_record.amount,
        0,
        'Cash transfer in'
      ),
      -- Credit the cash account
      (
        transaction_id,
        cash_account_id,
        0,
        transfer_record.amount,
        'Cash transfer out'
      );
      
      -- Update cash drawer balance
      UPDATE public.cash_drawers
      SET 
        current_balance = current_balance - transfer_record.amount,
        updated_at = now()
      WHERE id = transfer_record.from_drawer_id;
      
      -- Create cash transaction
      INSERT INTO public.cash_transactions (
        tenant_id, cash_drawer_id, transaction_type, amount, balance_after,
        reference_type, reference_id, description, performed_by, transaction_date
      ) VALUES (
        transfer_record.tenant_id,
        transfer_record.from_drawer_id,
        'account_transfer',
        -transfer_record.amount,
        (SELECT current_balance FROM public.cash_drawers WHERE id = transfer_record.from_drawer_id),
        'transfer_request',
        transfer_record.id,
        'Transfer to account: ' || transfer_record.reference_number,
        transfer_record.from_user_id,
        now()
      );
    END;
  END IF;
  
  RETURN TRUE;
END;
$$;