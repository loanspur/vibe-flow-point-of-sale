-- Check if transfer_requests table exists and create if missing
CREATE TABLE IF NOT EXISTS public.transfer_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  transfer_type text NOT NULL DEFAULT 'account',
  amount numeric NOT NULL,
  currency_code text NOT NULL DEFAULT 'KES',
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  from_drawer_id uuid,
  to_drawer_id uuid,
  to_account_id uuid,
  reason text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reference_number text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for transfer_requests
CREATE POLICY "Users can create transfer requests" 
ON public.transfer_requests 
FOR INSERT 
WITH CHECK ((tenant_id = get_user_tenant_id()) AND (from_user_id = auth.uid()));

CREATE POLICY "Users can view their transfer requests" 
ON public.transfer_requests 
FOR SELECT 
USING ((tenant_id = get_user_tenant_id()) AND ((from_user_id = auth.uid()) OR (to_user_id = auth.uid()) OR (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))));

CREATE POLICY "Users can respond to transfer requests" 
ON public.transfer_requests 
FOR UPDATE 
USING ((tenant_id = get_user_tenant_id()) AND ((to_user_id = auth.uid()) OR (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_transfer_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transfer_requests_updated_at
  BEFORE UPDATE ON public.transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transfer_requests_updated_at();