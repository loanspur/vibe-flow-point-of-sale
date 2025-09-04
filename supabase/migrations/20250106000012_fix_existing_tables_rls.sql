-- ============================================================================
-- MIGRATION 6: FIX EXISTING TABLES RLS POLICIES
-- ============================================================================
-- This migration fixes RLS policies only for tables that actually exist

-- ============================================================================
-- PART 1: FIX ACCOUNT_TYPES TABLE RLS POLICY (if it exists)
-- ============================================================================

-- 1.1: Drop existing RLS policy on account_types if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_types') THEN
        DROP POLICY IF EXISTS "Users can manage account_types for their tenant" ON public.account_types;
        DROP POLICY IF EXISTS "Authenticated users can manage account_types for their tenant" ON public.account_types;
        
        -- Create permissive RLS policy for account_types
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
        
        RAISE NOTICE 'Fixed RLS policy for account_types table';
    ELSE
        RAISE NOTICE 'account_types table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 2: FIX ACCOUNTS TABLE RLS POLICY (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        DROP POLICY IF EXISTS "Users can manage accounts for their tenant" ON public.accounts;
        DROP POLICY IF EXISTS "Authenticated users can manage accounts for their tenant" ON public.accounts;
        
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
        
        RAISE NOTICE 'Fixed RLS policy for accounts table';
    ELSE
        RAISE NOTICE 'accounts table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 3: FIX BUSINESS_SETTINGS TABLE RLS POLICY (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_settings') THEN
        DROP POLICY IF EXISTS "Users can manage business_settings for their tenant" ON public.business_settings;
        DROP POLICY IF EXISTS "Authenticated users can manage business_settings for their tenant" ON public.business_settings;
        
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
        
        RAISE NOTICE 'Fixed RLS policy for business_settings table';
    ELSE
        RAISE NOTICE 'business_settings table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 4: FIX INVENTORY_JOURNAL TABLE RLS POLICY (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_journal') THEN
        DROP POLICY IF EXISTS "Users can manage inventory_journal for their tenant" ON public.inventory_journal;
        DROP POLICY IF EXISTS "Authenticated users can manage inventory_journal for their tenant" ON public.inventory_journal;
        
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
        
        RAISE NOTICE 'Fixed RLS policy for inventory_journal table';
    ELSE
        RAISE NOTICE 'inventory_journal table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 5: FIX PRODUCTS TABLE RLS POLICY (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        DROP POLICY IF EXISTS "Users can manage products for their tenant" ON public.products;
        DROP POLICY IF EXISTS "Authenticated users can manage products for their tenant" ON public.products;
        
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
        
        RAISE NOTICE 'Fixed RLS policy for products table';
    ELSE
        RAISE NOTICE 'products table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 6: FIX INVENTORY_LEVELS TABLE RLS POLICY (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_levels') THEN
        DROP POLICY IF EXISTS "Users can manage inventory_levels for their tenant" ON public.inventory_levels;
        DROP POLICY IF EXISTS "Authenticated users can manage inventory_levels for their tenant" ON public.inventory_levels;
        
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
        
        RAISE NOTICE 'Fixed RLS policy for inventory_levels table';
    ELSE
        RAISE NOTICE 'inventory_levels table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 7: FIX CUSTOMERS TABLE RLS POLICY (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        DROP POLICY IF EXISTS "Users can manage customers for their tenant" ON public.customers;
        DROP POLICY IF EXISTS "Authenticated users can manage customers for their tenant" ON public.customers;
        
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
        
        RAISE NOTICE 'Fixed RLS policy for customers table';
    ELSE
        RAISE NOTICE 'customers table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 8: FIX LOCATIONS TABLE RLS POLICY (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
        DROP POLICY IF EXISTS "Users can manage locations for their tenant" ON public.locations;
        DROP POLICY IF EXISTS "Authenticated users can manage locations for their tenant" ON public.locations;
        
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
        
        RAISE NOTICE 'Fixed RLS policy for locations table';
    ELSE
        RAISE NOTICE 'locations table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- PART 9: LIST ALL EXISTING TABLES FOR DEBUGGING
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '=== EXISTING TABLES IN PUBLIC SCHEMA ===';
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    LOOP
        RAISE NOTICE 'Table: %', table_record.table_name;
    END LOOP;
    RAISE NOTICE '=== END OF TABLES LIST ===';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration only fixes RLS policies for tables that actually exist
-- and provides a list of all existing tables for debugging
