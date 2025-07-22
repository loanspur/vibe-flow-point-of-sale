-- Enable RLS on returns table if not already enabled
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for returns table
DROP POLICY IF EXISTS "Tenant staff can manage returns" ON public.returns;
DROP POLICY IF EXISTS "Tenant users can view returns" ON public.returns;
DROP POLICY IF EXISTS "Tenant staff can manage tenant returns" ON public.returns;
DROP POLICY IF EXISTS "Tenant users can view tenant returns" ON public.returns;

-- Create new policies for returns that handle both purchase and sales returns
CREATE POLICY "Tenant staff can manage all returns"
ON public.returns
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])));

CREATE POLICY "Tenant users can view all returns"
ON public.returns
FOR SELECT
USING (tenant_id = get_user_tenant_id());