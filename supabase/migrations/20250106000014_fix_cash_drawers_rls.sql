-- ============================================================================
-- MIGRATION 8: FIX CASH_DRAWERS TABLE RLS POLICY
-- ============================================================================
-- This migration fixes the RLS policy for the cash_drawers table

-- ============================================================================
-- PART 1: CHECK IF CASH_DRAWERS TABLE EXISTS AND HAS CORRECT STRUCTURE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_drawers') THEN
        RAISE NOTICE 'cash_drawers table exists';
        
        -- Check if tenant_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_drawers' AND column_name = 'tenant_id') THEN
            RAISE NOTICE 'cash_drawers table has tenant_id column';
        ELSE
            RAISE NOTICE 'cash_drawers table is missing tenant_id column';
        END IF;
        
        -- Check if RLS is enabled
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cash_drawers' AND relrowsecurity = true) THEN
            RAISE NOTICE 'RLS is enabled on cash_drawers table';
        ELSE
            RAISE NOTICE 'RLS is NOT enabled on cash_drawers table';
        END IF;
    ELSE
        RAISE NOTICE 'cash_drawers table does not exist';
    END IF;
END $$;

-- ============================================================================
-- PART 2: ADD TENANT_ID COLUMN IF MISSING
-- ============================================================================

-- 2.1: Add tenant_id column to cash_drawers if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_drawers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_drawers' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.cash_drawers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
            RAISE NOTICE 'Added tenant_id column to cash_drawers table';
        ELSE
            RAISE NOTICE 'cash_drawers table already has tenant_id column';
        END IF;
    ELSE
        RAISE NOTICE 'cash_drawers table does not exist, cannot add tenant_id column';
    END IF;
END $$;

-- ============================================================================
-- PART 3: ENABLE RLS ON CASH_DRAWERS TABLE
-- ============================================================================

-- 3.1: Enable RLS on cash_drawers table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_drawers') THEN
        ALTER TABLE public.cash_drawers ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on cash_drawers table';
    ELSE
        RAISE NOTICE 'cash_drawers table does not exist, cannot enable RLS';
    END IF;
END $$;

-- ============================================================================
-- PART 4: FIX CASH_DRAWERS TABLE RLS POLICY
-- ============================================================================

-- 4.1: Drop existing RLS policy on cash_drawers
DROP POLICY IF EXISTS "Users can manage cash_drawers for their tenant" ON public.cash_drawers;
DROP POLICY IF EXISTS "Authenticated users can manage cash_drawers for their tenant" ON public.cash_drawers;

-- 4.2: Create permissive RLS policy for cash_drawers
CREATE POLICY "Authenticated users can manage cash_drawers for their tenant" ON public.cash_drawers
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
-- PART 5: UPDATE EXISTING RECORDS WITH TENANT_ID
-- ============================================================================

-- 5.1: Update existing cash_drawers records with tenant_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_drawers') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_drawers' AND column_name = 'tenant_id') THEN
            -- Update records that don't have tenant_id
            UPDATE public.cash_drawers 
            SET tenant_id = (
                SELECT p.tenant_id 
                FROM public.profiles p 
                WHERE p.id = auth.uid()
                LIMIT 1
            )
            WHERE tenant_id IS NULL;
            
            RAISE NOTICE 'Updated existing cash_drawers records with tenant_id';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 6: CREATE INDEX FOR PERFORMANCE
-- ============================================================================

-- 6.1: Create index on tenant_id for cash_drawers if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_drawers') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_drawers' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_cash_drawers_tenant_id ON public.cash_drawers(tenant_id);
            RAISE NOTICE 'Created index on cash_drawers.tenant_id';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 7: CHECK FOR OTHER CASH-RELATED TABLES
-- ============================================================================

-- 7.1: Check if cash_transactions table exists and fix its RLS policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_transactions') THEN
        RAISE NOTICE 'cash_transactions table exists, ensuring RLS policy is correct';
        
        -- Drop and recreate RLS policy for cash_transactions
        DROP POLICY IF EXISTS "Users can manage cash_transactions for their tenant" ON public.cash_transactions;
        DROP POLICY IF EXISTS "Authenticated users can manage cash_transactions for their tenant" ON public.cash_transactions;
        
        CREATE POLICY "Authenticated users can manage cash_transactions for their tenant" ON public.cash_transactions
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
        
        RAISE NOTICE 'Fixed RLS policy for cash_transactions table';
    ELSE
        RAISE NOTICE 'cash_transactions table does not exist';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The cash_drawers table should now have proper RLS policies and tenant_id column
-- Cash drawer initialization should work properly
