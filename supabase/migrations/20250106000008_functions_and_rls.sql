-- ============================================================================
-- MIGRATION 2: FUNCTIONS AND RLS POLICIES
-- ============================================================================
-- This migration handles all functions and RLS policies
-- Run this AFTER the schema fixes migration

-- ============================================================================
-- PART 1: CREATE CORE FUNCTIONS
-- ============================================================================

-- 1.1: Drop existing function with all dependencies and create a simple get_current_user_role function
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
CREATE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role_val TEXT;
BEGIN
    -- First try to get role from profiles table
    SELECT role::TEXT INTO user_role_val
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- If not found in profiles, try tenant_users table
    IF user_role_val IS NULL THEN
        SELECT tu.role INTO user_role_val
        FROM public.tenant_users tu
        WHERE tu.user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    -- Return the role, defaulting to 'user' if still null
    RETURN COALESCE(user_role_val, 'user');
END;
$$;

-- 1.2: Drop existing function with all dependencies and create function to ensure tenant creators get admin role
DROP FUNCTION IF EXISTS public.ensure_tenant_creator_is_admin() CASCADE;
CREATE FUNCTION public.ensure_tenant_creator_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Ensure the creator has admin role in profiles
    UPDATE public.profiles 
    SET role = 'admin'::public.user_role
    WHERE id = NEW.created_by
    AND (role IS NULL OR role = 'user'::public.user_role);
    
    -- Ensure tenant_users entry exists
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- 1.3: Create trigger for tenant creation
DROP TRIGGER IF EXISTS ensure_tenant_creator_admin ON public.tenants;
CREATE TRIGGER ensure_tenant_creator_admin
    AFTER INSERT ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_tenant_creator_is_admin();

-- 1.4: Drop existing function with all dependencies and create a simple tenant membership check function
DROP FUNCTION IF EXISTS public.is_tenant_member() CASCADE;
CREATE FUNCTION public.is_tenant_member()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Get user's tenant_id from profiles
    SELECT tenant_id INTO user_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- If not found in profiles, try tenant_users table
    IF user_tenant_id IS NULL THEN
        SELECT tenant_id INTO user_tenant_id
        FROM public.tenant_users
        WHERE user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    -- Return true if user has a tenant_id
    RETURN user_tenant_id IS NOT NULL;
END;
$$;

-- ============================================================================
-- PART 2: CREATE UNIFIED RLS POLICIES
-- ============================================================================

-- 2.1: Fix payments table RLS policy
DROP POLICY IF EXISTS "Users can manage payments for their tenant" ON public.payments;
CREATE POLICY "Users can manage payments for their tenant" ON public.payments
    FOR ALL USING (
        tenant_id IN (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- 2.2: Fix accounting_transactions table RLS policy
DROP POLICY IF EXISTS "Users can manage accounting_transactions for their tenant" ON public.accounting_transactions;
CREATE POLICY "Users can manage accounting_transactions for their tenant" ON public.accounting_transactions
    FOR ALL USING (
        tenant_id IN (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- 2.3: Fix cash_transactions table RLS policy
DROP POLICY IF EXISTS "Users can manage cash_transactions for their tenant" ON public.cash_transactions;
CREATE POLICY "Users can manage cash_transactions for their tenant" ON public.cash_transactions
    FOR ALL USING (
        tenant_id IN (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- 2.4: Fix sales table RLS policy
DROP POLICY IF EXISTS "Users can manage sales for their tenant" ON public.sales;
CREATE POLICY "Users can manage sales for their tenant" ON public.sales
    FOR ALL USING (
        tenant_id IN (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- 2.5: Fix sale_items table RLS policy
DROP POLICY IF EXISTS "Users can manage sale_items for their tenant" ON public.sale_items;
CREATE POLICY "Users can manage sale_items for their tenant" ON public.sale_items
    FOR ALL USING (
        sale_id IN (
            SELECT s.id FROM public.sales s
            WHERE s.tenant_id IN (
                SELECT COALESCE(p.tenant_id, tu.tenant_id)
                FROM public.profiles p
                LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
                WHERE p.id = auth.uid()
            )
        )
    );

-- 2.6: Fix payment_methods table RLS policy
DROP POLICY IF EXISTS "Users can manage payment_methods for their tenant" ON public.payment_methods;
CREATE POLICY "Users can manage payment_methods for their tenant" ON public.payment_methods
    FOR ALL USING (
        tenant_id IN (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- ============================================================================
-- PART 3: CREATE ADDITIONAL HELPER FUNCTIONS
-- ============================================================================

-- 3.1: Function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Get user's tenant_id from profiles
    SELECT tenant_id INTO user_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- If not found in profiles, try tenant_users table
    IF user_tenant_id IS NULL THEN
        SELECT tenant_id INTO user_tenant_id
        FROM public.tenant_users
        WHERE user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN user_tenant_id;
END;
$$;

-- 3.2: Function to check if user is tenant admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role_val TEXT;
BEGIN
    user_role_val := public.get_current_user_role();
    RETURN user_role_val IN ('admin', 'superadmin');
END;
$$;

-- 3.3: Function to check if user can manage roles
CREATE OR REPLACE FUNCTION public.can_manage_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role_val TEXT;
BEGIN
    user_role_val := public.get_current_user_role();
    RETURN user_role_val IN ('admin', 'superadmin');
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All functions and RLS policies have been created/updated
-- The system should now have proper role assignment and tenant-aware access control
