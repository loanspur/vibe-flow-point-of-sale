-- Create cash drawers table to track cash drawers per user
CREATE TABLE public.cash_drawers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  drawer_name TEXT NOT NULL DEFAULT 'Main Cash Drawer',
  current_balance NUMERIC NOT NULL DEFAULT 0,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  opened_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'suspended')),
  location_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create cash transactions table to track all cash movements
CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  cash_drawer_id UUID NOT NULL REFERENCES public.cash_drawers(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale_payment', 'change_issued', 'opening_balance', 'closing_balance', 'bank_deposit', 'expense_payment', 'transfer_out', 'transfer_in', 'adjustment')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT NOT NULL,
  performed_by UUID NOT NULL,
  approved_by UUID,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cash transfer requests table for user-to-user transfers
CREATE TABLE public.cash_transfer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  from_drawer_id UUID NOT NULL REFERENCES public.cash_drawers(id),
  to_drawer_id UUID NOT NULL REFERENCES public.cash_drawers(id),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transfer_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_drawers
CREATE POLICY "Tenant users can view their cash drawers"
ON public.cash_drawers
FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can manage cash drawers"
ON public.cash_drawers
FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
);

-- RLS Policies for cash_transactions
CREATE POLICY "Tenant users can view cash transactions"
ON public.cash_transactions
FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff can manage cash transactions"
ON public.cash_transactions
FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
);

-- RLS Policies for cash_transfer_requests
CREATE POLICY "Users can view their transfer requests"
ON public.cash_transfer_requests
FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND 
  (from_user_id = auth.uid() OR to_user_id = auth.uid() OR get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
);

CREATE POLICY "Users can create transfer requests"
ON public.cash_transfer_requests
FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  from_user_id = auth.uid()
);

CREATE POLICY "Users can respond to transfer requests"
ON public.cash_transfer_requests
FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND 
  (to_user_id = auth.uid() OR get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
);

-- Create function to open a cash drawer
CREATE OR REPLACE FUNCTION public.open_cash_drawer(
  drawer_id_param UUID,
  opening_balance_param NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  drawer_record RECORD;
BEGIN
  -- Get drawer details
  SELECT * INTO drawer_record FROM public.cash_drawers WHERE id = drawer_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash drawer not found';
  END IF;
  
  -- Update drawer status and balance
  UPDATE public.cash_drawers 
  SET 
    status = 'open',
    opening_balance = opening_balance_param,
    current_balance = opening_balance_param,
    opened_at = now(),
    closed_at = NULL,
    updated_at = now()
  WHERE id = drawer_id_param;
  
  -- Record opening balance transaction
  INSERT INTO public.cash_transactions (
    tenant_id, cash_drawer_id, transaction_type, amount, balance_after,
    description, performed_by
  ) VALUES (
    drawer_record.tenant_id, drawer_id_param, 'opening_balance', 
    opening_balance_param, opening_balance_param,
    'Cash drawer opened with opening balance', auth.uid()
  );
  
  RETURN TRUE;
END;
$$;

-- Create function to process cash transfer
CREATE OR REPLACE FUNCTION public.process_cash_transfer(
  transfer_request_id_param UUID,
  action_param TEXT,
  notes_param TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  transfer_record RECORD;
  from_drawer_balance NUMERIC;
  to_drawer_balance NUMERIC;
BEGIN
  -- Get transfer request details
  SELECT * INTO transfer_record FROM public.cash_transfer_requests WHERE id = transfer_request_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer request not found';
  END IF;
  
  IF transfer_record.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer request is no longer pending';
  END IF;
  
  -- Update transfer request status
  UPDATE public.cash_transfer_requests
  SET 
    status = action_param,
    responded_at = now(),
    notes = notes_param,
    updated_at = now()
  WHERE id = transfer_request_id_param;
  
  -- If approved, process the actual transfer
  IF action_param = 'approved' THEN
    -- Check source drawer balance
    SELECT current_balance INTO from_drawer_balance 
    FROM public.cash_drawers 
    WHERE id = transfer_record.from_drawer_id;
    
    IF from_drawer_balance < transfer_record.amount THEN
      RAISE EXCEPTION 'Insufficient funds in source drawer';
    END IF;
    
    -- Update source drawer
    UPDATE public.cash_drawers
    SET 
      current_balance = current_balance - transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.from_drawer_id;
    
    -- Update destination drawer
    UPDATE public.cash_drawers
    SET 
      current_balance = current_balance + transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.to_drawer_id;
    
    -- Get updated balances
    SELECT current_balance INTO from_drawer_balance FROM public.cash_drawers WHERE id = transfer_record.from_drawer_id;
    SELECT current_balance INTO to_drawer_balance FROM public.cash_drawers WHERE id = transfer_record.to_drawer_id;
    
    -- Record transactions
    INSERT INTO public.cash_transactions (
      tenant_id, cash_drawer_id, transaction_type, amount, balance_after,
      reference_type, reference_id, description, performed_by
    ) VALUES 
    (transfer_record.tenant_id, transfer_record.from_drawer_id, 'transfer_out', 
     -transfer_record.amount, from_drawer_balance, 'cash_transfer', transfer_request_id_param,
     'Cash transfer to ' || (SELECT drawer_name FROM public.cash_drawers WHERE id = transfer_record.to_drawer_id),
     auth.uid()),
    (transfer_record.tenant_id, transfer_record.to_drawer_id, 'transfer_in',
     transfer_record.amount, to_drawer_balance, 'cash_transfer', transfer_request_id_param,
     'Cash transfer from ' || (SELECT drawer_name FROM public.cash_drawers WHERE id = transfer_record.from_drawer_id),
     auth.uid());
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_cash_drawers_tenant_user ON public.cash_drawers(tenant_id, user_id);
CREATE INDEX idx_cash_transactions_drawer_date ON public.cash_transactions(cash_drawer_id, transaction_date);
CREATE INDEX idx_cash_transfer_requests_users ON public.cash_transfer_requests(from_user_id, to_user_id, status);