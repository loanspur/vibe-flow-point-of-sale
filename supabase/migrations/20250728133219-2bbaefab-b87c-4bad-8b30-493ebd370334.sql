-- Fix RLS policies for tenant_custom_pricing

-- Drop all existing policies
DROP POLICY IF EXISTS "Superadmins can manage all custom pricing" ON public.tenant_custom_pricing;
DROP POLICY IF EXISTS "Tenant admins can manage their custom pricing" ON public.tenant_custom_pricing;
DROP POLICY IF EXISTS "Tenant admins can manage custom pricing" ON public.tenant_custom_pricing;

-- Create new comprehensive policies
CREATE POLICY "Superadmins can manage all custom pricing" 
ON public.tenant_custom_pricing 
FOR ALL 
USING (get_current_user_role() = 'superadmin'::user_role);

CREATE POLICY "Tenant admins can view and manage their custom pricing" 
ON public.tenant_custom_pricing 
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
);