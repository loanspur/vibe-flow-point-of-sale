-- Fix payment methods deletion policy to allow more user roles
-- This migration updates the RLS policy to allow users with appropriate permissions to delete payment methods

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Tenant managers can manage payment methods" ON public.payment_methods;

-- Create a more permissive policy that allows users to manage payment methods
-- This policy allows any authenticated user within the tenant to manage payment methods
-- since payment methods are business configuration that should be manageable by business users
CREATE POLICY "Tenant users can manage payment methods" 
ON public.payment_methods
FOR ALL 
USING (
    tenant_id = get_user_tenant_id() 
    AND auth.uid() IS NOT NULL  -- User must be authenticated
);

-- Alternative: If you want to keep role-based restrictions but be more permissive,
-- you can use this policy instead (uncomment and comment out the above):
/*
CREATE POLICY "Tenant users can manage payment methods" 
ON public.payment_methods
FOR ALL 
USING (
    tenant_id = get_user_tenant_id() 
    AND (
        get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
        OR get_current_user_role() IS NULL  -- Allow if role is not set (backward compatibility)
    )
);
*/

-- Ensure the view policy remains unchanged
-- (The SELECT policy should already allow all tenant users to view payment methods)

