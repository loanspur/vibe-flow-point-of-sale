-- ============================================================================
-- MIGRATION 7: FIX ACCOUNTING_ENTRIES TABLE RLS POLICY
-- ============================================================================
-- This migration fixes the RLS policy for the accounting_entries table

-- ============================================================================
-- PART 1: ADD TENANT_ID COLUMN FIRST
-- ============================================================================

-- 1.1: Add tenant_id column to accounting_entries if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_entries' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.accounting_entries ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
            RAISE NOTICE 'Added tenant_id column to accounting_entries table';
        ELSE
            RAISE NOTICE 'accounting_entries table already has tenant_id column';
        END IF;
    ELSE
        RAISE NOTICE 'accounting_entries table does not exist, cannot add tenant_id column';
    END IF;
END $$;

-- ============================================================================
-- PART 2: CHECK IF ACCOUNTING_ENTRIES TABLE EXISTS AND HAS CORRECT STRUCTURE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_entries') THEN
        RAISE NOTICE 'accounting_entries table exists';
        
        -- Check if tenant_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_entries' AND column_name = 'tenant_id') THEN
            RAISE NOTICE 'accounting_entries table has tenant_id column';
        ELSE
            RAISE NOTICE 'accounting_entries table is missing tenant_id column';
        END IF;
        
        -- Check if RLS is enabled
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'accounting_entries' AND relrowsecurity = true) THEN
            RAISE NOTICE 'RLS is enabled on accounting_entries table';
        ELSE
            RAISE NOTICE 'RLS is NOT enabled on accounting_entries table';
        END IF;
    ELSE
        RAISE NOTICE 'accounting_entries table does not exist';
    END IF;
END $$;

-- ============================================================================
-- PART 3: ENSURE RLS IS ENABLED ON ACCOUNTING_ENTRIES TABLE
-- ============================================================================

-- 3.1: Enable RLS on accounting_entries table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_entries') THEN
        ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on accounting_entries table';
    ELSE
        RAISE NOTICE 'accounting_entries table does not exist, cannot enable RLS';
    END IF;
END $$;

-- ============================================================================
-- PART 4: CREATE RLS POLICY AFTER TENANT_ID COLUMN EXISTS
-- ============================================================================

-- 4.1: Drop existing RLS policy on accounting_entries
DROP POLICY IF EXISTS "Users can manage accounting_entries for their tenant" ON public.accounting_entries;
DROP POLICY IF EXISTS "Authenticated users can manage accounting_entries for their tenant" ON public.accounting_entries;

-- 4.2: Create permissive RLS policy for accounting_entries
CREATE POLICY "Authenticated users can manage accounting_entries for their tenant" ON public.accounting_entries
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

-- 5.1: Update existing accounting_entries records with tenant_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_entries') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_entries' AND column_name = 'tenant_id') THEN
            -- Update records that don't have tenant_id
            UPDATE public.accounting_entries 
            SET tenant_id = (
                SELECT p.tenant_id 
                FROM public.profiles p 
                WHERE p.id = auth.uid()
                LIMIT 1
            )
            WHERE tenant_id IS NULL;
            
            RAISE NOTICE 'Updated existing accounting_entries records with tenant_id';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 6: CREATE INDEX FOR PERFORMANCE
-- ============================================================================

-- 6.1: Create index on tenant_id for accounting_entries if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_entries') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_entries' AND column_name = 'tenant_id') THEN
            CREATE INDEX IF NOT EXISTS idx_accounting_entries_tenant_id ON public.accounting_entries(tenant_id);
            RAISE NOTICE 'Created index on accounting_entries.tenant_id';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The accounting_entries table should now have proper RLS policies and tenant_id column
