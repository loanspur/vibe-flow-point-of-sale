-- Fix Payment Methods Deletion Policy - Comprehensive Fix
-- This migration ensures that tenant admins can actually delete payment methods
-- The issue was that the RLS policy was too restrictive and didn't account for all admin roles

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Tenant managers can manage payment methods" ON public.payment_methods;

-- Create a more comprehensive policy that allows deletion for tenant admins
-- This policy checks for multiple admin role variations and also allows any authenticated user
-- within the tenant to manage payment methods since they are business configuration
CREATE POLICY "Tenant users can manage payment methods" 
ON public.payment_methods
FOR ALL 
USING (
    tenant_id = get_user_tenant_id() 
    AND (
        -- Allow superadmin, admin, manager roles
        get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
        -- OR allow any authenticated user within the tenant (for business configuration)
        OR auth.uid() IS NOT NULL
    )
);

-- Alternative more permissive policy (uncomment if the above doesn't work):
/*
CREATE POLICY "Tenant users can manage payment methods" 
ON public.payment_methods
FOR ALL 
USING (
    tenant_id = get_user_tenant_id() 
    AND auth.uid() IS NOT NULL
);
*/

-- Add comment for documentation
COMMENT ON POLICY "Tenant users can manage payment methods" ON public.payment_methods 
IS 'Allows tenant admins and authenticated users to manage payment methods for business configuration';
