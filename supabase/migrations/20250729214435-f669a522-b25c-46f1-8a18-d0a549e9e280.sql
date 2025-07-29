-- Add bank transfer requests table
CREATE TABLE public.cash_bank_transfer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  cash_drawer_id UUID NOT NULL REFERENCES public.cash_drawers(id),
  requested_by UUID NOT NULL,
  amount NUMERIC NOT NULL,
  bank_account_name TEXT NOT NULL,
  reference_number TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_bank_transfer_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant users can view bank transfer requests"
ON public.cash_bank_transfer_requests
FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create bank transfer requests"
ON public.cash_bank_transfer_requests
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND requested_by = auth.uid());

CREATE POLICY "Admins can approve bank transfer requests"
ON public.cash_bank_transfer_requests
FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

-- Function to process bank transfer
CREATE OR REPLACE FUNCTION public.process_bank_transfer(
  transfer_id_param UUID,
  action_param TEXT,
  notes_param TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  transfer_record RECORD;
  drawer_balance NUMERIC;
BEGIN
  -- Get transfer request details
  SELECT * INTO transfer_record FROM public.cash_bank_transfer_requests WHERE id = transfer_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer request not found';
  END IF;
  
  IF transfer_record.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer request is no longer pending';
  END IF;
  
  -- Update transfer request status
  UPDATE public.cash_bank_transfer_requests
  SET 
    status = action_param,
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = transfer_id_param;
  
  -- If approved, process the actual transfer
  IF action_param = 'approved' THEN
    -- Check drawer balance
    SELECT current_balance INTO drawer_balance 
    FROM public.cash_drawers 
    WHERE id = transfer_record.cash_drawer_id;
    
    IF drawer_balance < transfer_record.amount THEN
      RAISE EXCEPTION 'Insufficient funds in cash drawer';
    END IF;
    
    -- Update drawer balance
    UPDATE public.cash_drawers
    SET 
      current_balance = current_balance - transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.cash_drawer_id;
    
    -- Record transaction
    INSERT INTO public.cash_transactions (
      tenant_id, cash_drawer_id, transaction_type, amount, balance_after,
      reference_type, reference_id, description, performed_by
    ) VALUES (
      transfer_record.tenant_id, 
      transfer_record.cash_drawer_id, 
      'bank_deposit', 
      -transfer_record.amount, 
      drawer_balance - transfer_record.amount,
      'bank_transfer', 
      transfer_id_param,
      'Bank deposit: ' || transfer_record.bank_account_name,
      auth.uid()
    );
  END IF;
  
  RETURN TRUE;
END;
$$;