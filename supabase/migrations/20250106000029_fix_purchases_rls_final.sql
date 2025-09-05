-- Final Fix for Purchases RLS Policy
-- This migration ensures that tenant admins can create purchase records without RLS errors
-- The issue is that the current RLS policy is still too restrictive

-- Drop all existing policies on purchases table
DROP POLICY IF EXISTS "Tenant users can manage purchases" ON public.purchases;
DROP POLICY IF EXISTS "Tenant staff can manage tenant purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can manage purchases for their tenant" ON public.purchases;
DROP POLICY IF EXISTS "Allow authenticated users to manage purchases" ON public.purchases;

-- Create a simple, permissive policy for purchases
-- This allows any authenticated user to manage purchases within their tenant
CREATE POLICY "Allow authenticated users to manage purchases" 
ON public.purchases
FOR ALL 
USING (
    tenant_id = (
        SELECT COALESCE(p.tenant_id, tu.tenant_id)
        FROM public.profiles p
        LEFT JOIN public.tenant_users tu ON tu.user_id = p.user_id
        WHERE p.user_id = auth.uid()
        LIMIT 1
    )
    AND auth.uid() IS NOT NULL
);

-- Also fix purchase_items table with the same approach
DROP POLICY IF EXISTS "Tenant users can manage purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Tenant staff can manage purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Users can manage purchase items for their tenant" ON public.purchase_items;
DROP POLICY IF EXISTS "Allow authenticated users to manage purchase items" ON public.purchase_items;

CREATE POLICY "Allow authenticated users to manage purchase items" 
ON public.purchase_items
FOR ALL 
USING (
    purchase_id IN (
        SELECT id FROM public.purchases 
        WHERE tenant_id = (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.user_id
            WHERE p.user_id = auth.uid()
            LIMIT 1
        )
        AND auth.uid() IS NOT NULL
    )
);

-- Add comments for documentation
COMMENT ON POLICY "Allow authenticated users to manage purchases" ON public.purchases 
IS 'Allows any authenticated user to manage purchase records within their tenant';

COMMENT ON POLICY "Allow authenticated users to manage purchase items" ON public.purchase_items 
IS 'Allows any authenticated user to manage purchase item records within their tenant';

