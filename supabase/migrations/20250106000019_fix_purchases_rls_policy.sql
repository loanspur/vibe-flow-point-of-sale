-- Fix Purchases Table RLS Policy
-- This migration ensures that tenant admins can create purchase records
-- The issue was that the RLS policy was too restrictive and didn't account for all admin roles

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Tenant staff can manage tenant purchases" ON public.purchases;

-- Create a more comprehensive policy that allows purchase creation for tenant admins
-- This policy checks for multiple admin role variations and also allows any authenticated user
-- within the tenant to manage purchases since they are part of normal business operations
CREATE POLICY "Tenant users can manage purchases" 
ON public.purchases
FOR ALL 
USING (
    tenant_id = get_user_tenant_id() 
    AND (
        -- Allow superadmin, admin, manager, cashier roles
        get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
        -- OR allow any authenticated user within the tenant (for normal business operations)
        OR auth.uid() IS NOT NULL
    )
);

-- Also fix purchase_items table RLS policy
DROP POLICY IF EXISTS "Tenant staff can manage purchase items" ON public.purchase_items;

CREATE POLICY "Tenant users can manage purchase items" 
ON public.purchase_items
FOR ALL 
USING (
    purchase_id IN (
        SELECT id FROM public.purchases 
        WHERE tenant_id = get_user_tenant_id() 
        AND (
            get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
            OR auth.uid() IS NOT NULL
        )
    )
);

-- Add comment for documentation
COMMENT ON POLICY "Tenant users can manage purchases" ON public.purchases 
IS 'Allows tenant admins and authenticated users to manage purchase records for normal business operations';

COMMENT ON POLICY "Tenant users can manage purchase items" ON public.purchase_items 
IS 'Allows tenant admins and authenticated users to manage purchase item records for normal business operations';

