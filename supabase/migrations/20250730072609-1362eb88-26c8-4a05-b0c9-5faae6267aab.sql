-- Create a function to safely process cash transfer requests with overdraw protection
CREATE OR REPLACE FUNCTION public.process_cash_transfer_request(
  transfer_request_id_param uuid,
  action_param text -- 'approve' or 'reject'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  transfer_record RECORD;
  from_drawer_balance NUMERIC;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Get transfer request details
  SELECT * INTO transfer_record
  FROM public.cash_transfer_requests
  WHERE id = transfer_request_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer request not found';
  END IF;
  
  -- Check if already processed
  IF transfer_record.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer request already processed';
  END IF;
  
  IF action_param = 'approve' THEN
    -- Get current balance of from_drawer
    SELECT current_balance INTO from_drawer_balance
    FROM public.cash_drawers
    WHERE id = transfer_record.from_drawer_id;
    
    -- Check for overdraw protection
    IF from_drawer_balance < transfer_record.amount THEN
      RAISE EXCEPTION 'Insufficient funds in source drawer. Available: %, Requested: %', 
        from_drawer_balance, transfer_record.amount;
    END IF;
    
    -- Deduct from source drawer
    UPDATE public.cash_drawers
    SET 
      current_balance = current_balance - transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.from_drawer_id;
    
    -- Add to destination drawer
    UPDATE public.cash_drawers
    SET 
      current_balance = current_balance + transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.to_drawer_id;
    
    -- Create transaction records
    -- Debit transaction for source drawer
    INSERT INTO public.cash_transactions (
      tenant_id,
      cash_drawer_id,
      transaction_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      description,
      performed_by,
      transaction_date
    )
    SELECT 
      transfer_record.tenant_id,
      transfer_record.from_drawer_id,
      'drawer_transfer_out',
      -transfer_record.amount,
      cd.current_balance,
      'transfer_request',
      transfer_request_id_param,
      'Transfer to drawer: ' || COALESCE(cd_to.drawer_name, 'Unknown'),
      current_user_id,
      now()
    FROM public.cash_drawers cd
    LEFT JOIN public.cash_drawers cd_to ON cd_to.id = transfer_record.to_drawer_id
    WHERE cd.id = transfer_record.from_drawer_id;
    
    -- Credit transaction for destination drawer
    INSERT INTO public.cash_transactions (
      tenant_id,
      cash_drawer_id,
      transaction_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      description,
      performed_by,
      transaction_date
    )
    SELECT 
      transfer_record.tenant_id,
      transfer_record.to_drawer_id,
      'drawer_transfer_in',
      transfer_record.amount,
      cd.current_balance,
      'transfer_request',
      transfer_request_id_param,
      'Transfer from drawer: ' || COALESCE(cd_from.drawer_name, 'Unknown'),
      current_user_id,
      now()
    FROM public.cash_drawers cd
    LEFT JOIN public.cash_drawers cd_from ON cd_from.id = transfer_record.from_drawer_id
    WHERE cd.id = transfer_record.to_drawer_id;
    
    -- Update transfer request status
    UPDATE public.cash_transfer_requests
    SET 
      status = 'approved',
      responded_at = now()
    WHERE id = transfer_request_id_param;
    
  ELSIF action_param = 'reject' THEN
    -- Just update status to rejected
    UPDATE public.cash_transfer_requests
    SET 
      status = 'rejected',
      responded_at = now()
    WHERE id = transfer_request_id_param;
  ELSE
    RAISE EXCEPTION 'Invalid action. Must be approve or reject';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Add overdraw protection to cash transfer requests table
ALTER TABLE public.cash_transfer_requests 
ADD COLUMN IF NOT EXISTS responded_by uuid;

-- Add better transaction types for drawer transfers
DO $$
BEGIN
  -- Update existing account_transfer transactions to be more specific
  UPDATE public.cash_transactions 
  SET transaction_type = 'drawer_transfer_out'
  WHERE transaction_type = 'account_transfer' 
    AND amount < 0 
    AND reference_type = 'transfer_request';
    
  UPDATE public.cash_transactions 
  SET transaction_type = 'drawer_transfer_in'
  WHERE transaction_type = 'account_transfer' 
    AND amount > 0 
    AND reference_type = 'transfer_request';
END $$;