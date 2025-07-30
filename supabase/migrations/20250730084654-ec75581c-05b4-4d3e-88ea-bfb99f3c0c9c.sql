-- Fix RLS policies for transfer_requests table to allow proper transfer approval/rejection

-- First, check if transfer_requests table exists and enable RLS
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can create transfer requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Users can view their transfer requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Users can respond to transfer requests" ON public.transfer_requests;
DROP POLICY IF EXISTS "Admins can approve transfer requests" ON public.transfer_requests;

-- Policy for users to create their own transfer requests
CREATE POLICY "Users can create transfer requests" 
ON public.transfer_requests 
FOR INSERT 
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND from_user_id = auth.uid()
);

-- Policy for users to view transfer requests they're involved in
CREATE POLICY "Users can view their transfer requests" 
ON public.transfer_requests 
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  AND (
    from_user_id = auth.uid() 
    OR to_user_id = auth.uid() 
    OR get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
  )
);

-- Policy for users to update/respond to transfer requests (approve/reject)
CREATE POLICY "Users can respond to transfer requests" 
ON public.transfer_requests 
FOR UPDATE 
USING (
  tenant_id = get_user_tenant_id() 
  AND (
    to_user_id = auth.uid() 
    OR get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
  )
) 
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND (
    to_user_id = auth.uid() 
    OR get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
  )
);

-- Policy for admins to manage all transfer requests in their tenant
CREATE POLICY "Admins can manage all transfer requests" 
ON public.transfer_requests 
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
) 
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);