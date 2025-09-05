-- Simple Security Fix: Cross-tenant access prevention
-- This migration fixes the critical security vulnerabilities with a simpler approach

-- ============================================================================
-- PART 1: CREATE SECURE FUNCTIONS
-- ============================================================================

-- 1.1: Create secure tenant access function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id_secure()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Get tenant_id from profiles table
    SELECT p.tenant_id INTO user_tenant_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.tenant_id IS NOT NULL
    LIMIT 1;
    
    -- If not found, try tenant_users table
    IF user_tenant_id IS NULL THEN
        SELECT tu.tenant_id INTO user_tenant_id
        FROM public.tenant_users tu
        WHERE tu.user_id = auth.uid()
        AND tu.is_active = true
        LIMIT 1;
    END IF;
    
    RETURN user_tenant_id;
END;
$$;

-- 1.2: Create tenant membership check function
CREATE OR REPLACE FUNCTION public.is_user_tenant_member(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN target_tenant_id = get_user_tenant_id_secure();
END;
$$;

-- 1.3: Create superadmin check function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.role = 'superadmin'
    );
END;
$$;

-- ============================================================================
-- PART 2: FIX CRITICAL RLS POLICIES
-- ============================================================================

-- 2.1: Fix profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Superadmins can view all profiles" ON public.profiles
    FOR SELECT USING (is_superadmin());

-- 2.2: Fix tenant_users table
DROP POLICY IF EXISTS "Users can view tenant_users for their tenant" ON public.tenant_users;
DROP POLICY IF EXISTS "Admins can manage tenant_users for their tenant" ON public.tenant_users;

CREATE POLICY "Users can view tenant_users for their tenant" ON public.tenant_users
    FOR SELECT USING (is_user_tenant_member(tenant_id));

CREATE POLICY "Admins can manage tenant_users for their tenant" ON public.tenant_users
    FOR ALL USING (is_user_tenant_member(tenant_id) AND is_superadmin());

-- 2.3: Fix payments table
DROP POLICY IF EXISTS "Tenant users can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated users to manage payments" ON public.payments;

CREATE POLICY "Users can manage payments for their tenant" ON public.payments
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- 2.4: Fix sales table
DROP POLICY IF EXISTS "Tenant users can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to manage sales" ON public.sales;

CREATE POLICY "Users can manage sales for their tenant" ON public.sales
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- 2.5: Fix purchases table
DROP POLICY IF EXISTS "Allow authenticated users to manage purchases" ON public.purchases;
DROP POLICY IF EXISTS "Tenant users can manage purchases" ON public.purchases;

CREATE POLICY "Users can manage purchases for their tenant" ON public.purchases
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- 2.6: Fix purchase_items table
DROP POLICY IF EXISTS "Allow authenticated users to manage purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Tenant users can manage purchase items" ON public.purchase_items;

CREATE POLICY "Users can manage purchase items for their tenant" ON public.purchase_items
    FOR ALL USING (
        purchase_id IN (
            SELECT id FROM public.purchases 
            WHERE is_user_tenant_member(tenant_id)
        )
    );

-- 2.7: Fix products table
DROP POLICY IF EXISTS "Tenant users can manage products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON public.products;

CREATE POLICY "Users can manage products for their tenant" ON public.products
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- 2.8: Fix contacts table
DROP POLICY IF EXISTS "Tenant users can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow authenticated users to manage contacts" ON public.contacts;

CREATE POLICY "Users can manage contacts for their tenant" ON public.contacts
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- 2.9: Fix accounting_transactions table
DROP POLICY IF EXISTS "Tenant users can manage accounting transactions" ON public.accounting_transactions;
DROP POLICY IF EXISTS "Allow authenticated users to manage accounting transactions" ON public.accounting_transactions;

CREATE POLICY "Users can manage accounting transactions for their tenant" ON public.accounting_transactions
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- 2.10: Fix cash_transactions table
DROP POLICY IF EXISTS "Tenant users can manage cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Allow authenticated users to manage cash transactions" ON public.cash_transactions;

CREATE POLICY "Users can manage cash transactions for their tenant" ON public.cash_transactions
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- 2.11: Fix store_locations table
DROP POLICY IF EXISTS "Tenant users can manage store locations" ON public.store_locations;
DROP POLICY IF EXISTS "Allow authenticated users to manage store locations" ON public.store_locations;

CREATE POLICY "Users can manage store locations for their tenant" ON public.store_locations
    FOR ALL USING (is_user_tenant_member(tenant_id));

-- ============================================================================
-- PART 3: ADD COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_user_tenant_id_secure() IS 'Securely gets the tenant ID for the current user';
COMMENT ON FUNCTION public.is_user_tenant_member(UUID) IS 'Checks if the current user is a member of the specified tenant';
COMMENT ON FUNCTION public.is_superadmin() IS 'Checks if the current user has superadmin role';
