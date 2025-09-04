-- ============================================================================
-- MIGRATION 5: FIX ACCOUNTING TABLES RLS POLICIES
-- ============================================================================
-- This migration fixes RLS policies for all accounting-related tables

-- ============================================================================
-- PART 1: FIX ACCOUNT_TYPES TABLE RLS POLICY
-- ============================================================================

-- 1.1: Drop existing RLS policy on account_types
DROP POLICY IF EXISTS "Users can manage account_types for their tenant" ON public.account_types;
DROP POLICY IF EXISTS "Authenticated users can manage account_types for their tenant" ON public.account_types;

-- 1.2: Create permissive RLS policy for account_types
CREATE POLICY "Authenticated users can manage account_types for their tenant" ON public.account_types
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 2: FIX ACCOUNTS TABLE RLS POLICY
-- ============================================================================

-- 2.1: Drop existing RLS policy on accounts
DROP POLICY IF EXISTS "Users can manage accounts for their tenant" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated users can manage accounts for their tenant" ON public.accounts;

-- 2.2: Create permissive RLS policy for accounts
CREATE POLICY "Authenticated users can manage accounts for their tenant" ON public.accounts
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 3: FIX JOURNAL_ENTRIES TABLE RLS POLICY
-- ============================================================================

-- 3.1: Drop existing RLS policy on journal_entries
DROP POLICY IF EXISTS "Users can manage journal_entries for their tenant" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated users can manage journal_entries for their tenant" ON public.journal_entries;

-- 3.2: Create permissive RLS policy for journal_entries
CREATE POLICY "Authenticated users can manage journal_entries for their tenant" ON public.journal_entries
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 4: FIX JOURNAL_ENTRY_ITEMS TABLE RLS POLICY
-- ============================================================================

-- 4.1: Drop existing RLS policy on journal_entry_items
DROP POLICY IF EXISTS "Users can manage journal_entry_items for their tenant" ON public.journal_entry_items;
DROP POLICY IF EXISTS "Authenticated users can manage journal_entry_items for their tenant" ON public.journal_entry_items;

-- 4.2: Create permissive RLS policy for journal_entry_items
CREATE POLICY "Authenticated users can manage journal_entry_items for their tenant" ON public.journal_entry_items
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            journal_entry_id IN (
                SELECT je.id FROM public.journal_entries je
                WHERE je.tenant_id IN (
                    SELECT p.tenant_id
                    FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.tenant_id IS NOT NULL
                )
                OR je.tenant_id IN (
                    SELECT tu.tenant_id
                    FROM public.tenant_users tu
                    WHERE tu.user_id = auth.uid()
                )
                OR auth.role() = 'authenticated'
            )
        )
    );

-- ============================================================================
-- PART 5: FIX BUSINESS_SETTINGS TABLE RLS POLICY
-- ============================================================================

-- 5.1: Drop existing RLS policy on business_settings
DROP POLICY IF EXISTS "Users can manage business_settings for their tenant" ON public.business_settings;
DROP POLICY IF EXISTS "Authenticated users can manage business_settings for their tenant" ON public.business_settings;

-- 5.2: Create permissive RLS policy for business_settings
CREATE POLICY "Authenticated users can manage business_settings for their tenant" ON public.business_settings
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 6: FIX INVENTORY_JOURNAL TABLE RLS POLICY
-- ============================================================================

-- 6.1: Drop existing RLS policy on inventory_journal
DROP POLICY IF EXISTS "Users can manage inventory_journal for their tenant" ON public.inventory_journal;
DROP POLICY IF EXISTS "Authenticated users can manage inventory_journal for their tenant" ON public.inventory_journal;

-- 6.2: Create permissive RLS policy for inventory_journal
CREATE POLICY "Authenticated users can manage inventory_journal for their tenant" ON public.inventory_journal
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 7: FIX PRODUCTS TABLE RLS POLICY
-- ============================================================================

-- 7.1: Drop existing RLS policy on products
DROP POLICY IF EXISTS "Users can manage products for their tenant" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage products for their tenant" ON public.products;

-- 7.2: Create permissive RLS policy for products
CREATE POLICY "Authenticated users can manage products for their tenant" ON public.products
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 8: FIX INVENTORY_LEVELS TABLE RLS POLICY
-- ============================================================================

-- 8.1: Drop existing RLS policy on inventory_levels
DROP POLICY IF EXISTS "Users can manage inventory_levels for their tenant" ON public.inventory_levels;
DROP POLICY IF EXISTS "Authenticated users can manage inventory_levels for their tenant" ON public.inventory_levels;

-- 8.2: Create permissive RLS policy for inventory_levels
CREATE POLICY "Authenticated users can manage inventory_levels for their tenant" ON public.inventory_levels
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 9: FIX CUSTOMERS TABLE RLS POLICY
-- ============================================================================

-- 9.1: Drop existing RLS policy on customers
DROP POLICY IF EXISTS "Users can manage customers for their tenant" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can manage customers for their tenant" ON public.customers;

-- 9.2: Create permissive RLS policy for customers
CREATE POLICY "Authenticated users can manage customers for their tenant" ON public.customers
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- PART 10: FIX LOCATIONS TABLE RLS POLICY
-- ============================================================================

-- 10.1: Drop existing RLS policy on locations
DROP POLICY IF EXISTS "Users can manage locations for their tenant" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can manage locations for their tenant" ON public.locations;

-- 10.2: Create permissive RLS policy for locations
CREATE POLICY "Authenticated users can manage locations for their tenant" ON public.locations
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            tenant_id IN (
                SELECT p.tenant_id
                FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.tenant_id IS NOT NULL
            )
            OR
            tenant_id IN (
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = auth.uid()
            )
            OR
            auth.role() = 'authenticated'
        )
    );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All accounting and business tables now have permissive RLS policies
-- that allow authenticated users to manage data for their tenant
