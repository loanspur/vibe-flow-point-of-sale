-- ============================================================================
-- MIGRATION 3: FIX TENANT_USERS RLS RECURSION
-- ============================================================================
-- This migration fixes the infinite recursion in tenant_users RLS policies

-- ============================================================================
-- PART 1: DROP PROBLEMATIC RLS POLICIES
-- ============================================================================

-- 1.1: Drop the problematic RLS policies that cause recursion
DROP POLICY IF EXISTS "Users can view tenant_users for their tenant" ON public.tenant_users;
DROP POLICY IF EXISTS "Admins can manage tenant_users for their tenant" ON public.tenant_users;

-- ============================================================================
-- PART 2: CREATE SIMPLE, NON-RECURSIVE RLS POLICIES
-- ============================================================================

-- 2.1: Create a simple policy that only checks profiles table (no recursion)
CREATE POLICY "Users can view tenant_users for their tenant" ON public.tenant_users
    FOR SELECT USING (
        tenant_id IN (
            SELECT p.tenant_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id IS NOT NULL
        )
    );

-- 2.2: Create a simple policy for management that only checks profiles table
CREATE POLICY "Admins can manage tenant_users for their tenant" ON public.tenant_users
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id IS NOT NULL
            AND p.role IN ('admin', 'superadmin')
        )
    );

-- ============================================================================
-- PART 3: UPDATE OTHER RLS POLICIES TO AVOID RECURSION
-- ============================================================================

-- 3.1: Update payments table RLS policy to avoid tenant_users recursion
DROP POLICY IF EXISTS "Users can manage payments for their tenant" ON public.payments;
CREATE POLICY "Users can manage payments for their tenant" ON public.payments
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id IS NOT NULL
        )
    );

-- 3.2: Update accounting_transactions table RLS policy
DROP POLICY IF EXISTS "Users can manage accounting_transactions for their tenant" ON public.accounting_transactions;
CREATE POLICY "Users can manage accounting_transactions for their tenant" ON public.accounting_transactions
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id IS NOT NULL
        )
    );

-- 3.3: Update cash_transactions table RLS policy
DROP POLICY IF EXISTS "Users can manage cash_transactions for their tenant" ON public.cash_transactions;
CREATE POLICY "Users can manage cash_transactions for their tenant" ON public.cash_transactions
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id IS NOT NULL
        )
    );

-- 3.4: Update sales table RLS policy
DROP POLICY IF EXISTS "Users can manage sales for their tenant" ON public.sales;
CREATE POLICY "Users can manage sales for their tenant" ON public.sales
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id IS NOT NULL
        )
    );

-- 3.5: Update sale_items table RLS policy
DROP POLICY IF EXISTS "Users can manage sale_items for their tenant" ON public.sale_items;
CREATE POLICY "Users can manage sale_items for their tenant" ON public.sale_items
    FOR ALL USING (
        sale_id IN (
            SELECT s.id FROM public.sales s
            WHERE s.tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
        )
    );

-- 3.6: Update payment_methods table RLS policy
DROP POLICY IF EXISTS "Users can manage payment_methods for their tenant" ON public.payment_methods;
CREATE POLICY "Users can manage payment_methods for their tenant" ON public.payment_methods
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id IS NOT NULL
        )
    );

-- ============================================================================
-- PART 4: UPDATE HELPER FUNCTIONS TO AVOID RECURSION
-- ============================================================================

-- 4.1: Update get_current_user_role function to avoid tenant_users recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role_val TEXT;
BEGIN
    -- Only get role from profiles table to avoid recursion
    SELECT role::TEXT INTO user_role_val
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Return the role, defaulting to 'user' if still null
    RETURN COALESCE(user_role_val, 'user');
END;
$$;

-- 4.2: Update get_user_tenant_id function to avoid tenant_users recursion
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Only get tenant_id from profiles table to avoid recursion
    SELECT tenant_id INTO user_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_tenant_id;
END;
$$;

-- 4.3: Update is_tenant_member function to avoid tenant_users recursion
CREATE OR REPLACE FUNCTION public.is_tenant_member()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Only get tenant_id from profiles table to avoid recursion
    SELECT tenant_id INTO user_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Return true if user has a tenant_id
    RETURN user_tenant_id IS NOT NULL;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All RLS policies now avoid recursion by only querying the profiles table
-- The tenant_users table is still used for data storage but not for permission checks
