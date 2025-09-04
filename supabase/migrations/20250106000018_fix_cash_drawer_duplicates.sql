-- ============================================================================
-- MIGRATION 12: FIX CASH DRAWER DUPLICATES
-- ============================================================================
-- This migration fixes duplicate cash drawer records and ensures proper constraints

-- ============================================================================
-- PART 1: INVESTIGATE CURRENT STATE
-- ============================================================================

-- 1.1: Check for duplicate cash drawer records
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT tenant_id, user_id, status, COUNT(*) as count
        FROM public.cash_drawers
        GROUP BY tenant_id, user_id, status
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % duplicate cash drawer records', duplicate_count;
END $$;

-- 1.2: Show current cash drawer records
SELECT 
    'Current cash drawer records:' as info,
    id,
    tenant_id,
    user_id,
    drawer_name,
    status,
    is_active,
    created_at
FROM public.cash_drawers
ORDER BY tenant_id, user_id, created_at;

-- 1.3: Check for all foreign key references to cash_drawers
SELECT 
    'Foreign key references to cash_drawers:' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'cash_drawers'
AND tc.table_schema = 'public';

-- ============================================================================
-- PART 2: CLEAN UP DUPLICATE RECORDS
-- ============================================================================

-- 2.1: Keep only the most recent active drawer per user/tenant combination
-- First, update cash_transactions to point to the drawer we want to keep
WITH ranked_drawers AS (
    SELECT 
        id,
        tenant_id,
        user_id,
        status,
        is_active,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, user_id 
            ORDER BY 
                CASE WHEN is_active = true THEN 0 ELSE 1 END,
                created_at DESC
        ) as rn
    FROM public.cash_drawers
),
drawers_to_keep AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn = 1
),
drawers_to_delete AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn > 1
)
UPDATE public.cash_transactions
SET cash_drawer_id = drawers_to_keep.id
FROM drawers_to_keep, drawers_to_delete
WHERE cash_transactions.cash_drawer_id = drawers_to_delete.id
AND drawers_to_keep.tenant_id = drawers_to_delete.tenant_id
AND drawers_to_keep.user_id = drawers_to_delete.user_id;

-- Update cash_transfer_requests from_drawer_id
WITH ranked_drawers AS (
    SELECT 
        id,
        tenant_id,
        user_id,
        status,
        is_active,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, user_id 
            ORDER BY 
                CASE WHEN is_active = true THEN 0 ELSE 1 END,
                created_at DESC
        ) as rn
    FROM public.cash_drawers
),
drawers_to_keep AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn = 1
),
drawers_to_delete AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn > 1
)
UPDATE public.cash_transfer_requests
SET from_drawer_id = drawers_to_keep.id
FROM drawers_to_keep, drawers_to_delete
WHERE cash_transfer_requests.from_drawer_id = drawers_to_delete.id
AND drawers_to_keep.tenant_id = drawers_to_delete.tenant_id
AND drawers_to_keep.user_id = drawers_to_delete.user_id;

-- Update cash_transfer_requests to_drawer_id
WITH ranked_drawers AS (
    SELECT 
        id,
        tenant_id,
        user_id,
        status,
        is_active,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, user_id 
            ORDER BY 
                CASE WHEN is_active = true THEN 0 ELSE 1 END,
                created_at DESC
        ) as rn
    FROM public.cash_drawers
),
drawers_to_keep AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn = 1
),
drawers_to_delete AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn > 1
)
UPDATE public.cash_transfer_requests
SET to_drawer_id = drawers_to_keep.id
FROM drawers_to_keep, drawers_to_delete
WHERE cash_transfer_requests.to_drawer_id = drawers_to_delete.id
AND drawers_to_keep.tenant_id = drawers_to_delete.tenant_id
AND drawers_to_keep.user_id = drawers_to_delete.user_id;

-- Update transfer_requests from_drawer_id
WITH ranked_drawers AS (
    SELECT 
        id,
        tenant_id,
        user_id,
        status,
        is_active,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, user_id 
            ORDER BY 
                CASE WHEN is_active = true THEN 0 ELSE 1 END,
                created_at DESC
        ) as rn
    FROM public.cash_drawers
),
drawers_to_keep AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn = 1
),
drawers_to_delete AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn > 1
)
UPDATE public.transfer_requests
SET from_drawer_id = drawers_to_keep.id
FROM drawers_to_keep, drawers_to_delete
WHERE transfer_requests.from_drawer_id = drawers_to_delete.id
AND drawers_to_keep.tenant_id = drawers_to_delete.tenant_id
AND drawers_to_keep.user_id = drawers_to_delete.user_id;

-- Update transfer_requests to_drawer_id
WITH ranked_drawers AS (
    SELECT 
        id,
        tenant_id,
        user_id,
        status,
        is_active,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, user_id 
            ORDER BY 
                CASE WHEN is_active = true THEN 0 ELSE 1 END,
                created_at DESC
        ) as rn
    FROM public.cash_drawers
),
drawers_to_keep AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn = 1
),
drawers_to_delete AS (
    SELECT id, tenant_id, user_id
    FROM ranked_drawers
    WHERE rn > 1
)
UPDATE public.transfer_requests
SET to_drawer_id = drawers_to_keep.id
FROM drawers_to_keep, drawers_to_delete
WHERE transfer_requests.to_drawer_id = drawers_to_delete.id
AND drawers_to_keep.tenant_id = drawers_to_delete.tenant_id
AND drawers_to_keep.user_id = drawers_to_delete.user_id;

-- Note: We've handled the main foreign key references:
-- - cash_transactions (cash_drawer_id)
-- - cash_transfer_requests (from_drawer_id, to_drawer_id)  
-- - transfer_requests (from_drawer_id, to_drawer_id)
-- If there are other tables with foreign key references to cash_drawers, they would need to be
-- handled separately with their own CTE blocks

-- Now delete the duplicate drawers
WITH ranked_drawers AS (
    SELECT 
        id,
        tenant_id,
        user_id,
        status,
        is_active,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, user_id 
            ORDER BY 
                CASE WHEN is_active = true THEN 0 ELSE 1 END,
                created_at DESC
        ) as rn
    FROM public.cash_drawers
),
drawers_to_delete AS (
    SELECT id
    FROM ranked_drawers
    WHERE rn > 1
)
DELETE FROM public.cash_drawers
WHERE id IN (SELECT id FROM drawers_to_delete);

-- 2.2: Ensure only one active drawer per user/tenant
UPDATE public.cash_drawers
SET is_active = false
WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, user_id) id
    FROM public.cash_drawers
    WHERE is_active = true
    ORDER BY tenant_id, user_id, created_at DESC
);

-- ============================================================================
-- PART 3: FIX UNIQUE CONSTRAINT
-- ============================================================================

-- 3.1: Drop existing unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'cash_drawers_tenant_id_user_id_status_key'
    ) THEN
        ALTER TABLE public.cash_drawers 
        DROP CONSTRAINT cash_drawers_tenant_id_user_id_status_key;
        RAISE NOTICE 'Dropped existing unique constraint';
    END IF;
END $$;

-- 3.2: Create a better unique constraint - only one active drawer per user/tenant
CREATE UNIQUE INDEX IF NOT EXISTS cash_drawers_unique_active_per_user
ON public.cash_drawers (tenant_id, user_id)
WHERE is_active = true;

-- 3.3: Create a constraint to prevent multiple open drawers per user
CREATE UNIQUE INDEX IF NOT EXISTS cash_drawers_unique_open_per_user
ON public.cash_drawers (tenant_id, user_id)
WHERE status = 'open';

-- ============================================================================
-- PART 4: ADD HELPER FUNCTIONS
-- ============================================================================

-- 4.1: Create function to safely get or create cash drawer
CREATE OR REPLACE FUNCTION public.get_or_create_cash_drawer(
    p_tenant_id UUID,
    p_user_id UUID,
    p_drawer_name TEXT DEFAULT 'Main Cash Drawer'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    drawer_id UUID;
BEGIN
    -- Try to get existing active drawer
    SELECT id INTO drawer_id
    FROM public.cash_drawers
    WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
    AND is_active = true
    LIMIT 1;
    
    -- If no active drawer exists, create one
    IF drawer_id IS NULL THEN
        INSERT INTO public.cash_drawers (
            tenant_id,
            user_id,
            drawer_name,
            status,
            current_balance,
            opening_balance,
            is_active
        ) VALUES (
            p_tenant_id,
            p_user_id,
            p_drawer_name,
            'closed',
            0,
            0,
            true
        ) RETURNING id INTO drawer_id;
        
        RAISE NOTICE 'Created new cash drawer: %', drawer_id;
    ELSE
        RAISE NOTICE 'Found existing cash drawer: %', drawer_id;
    END IF;
    
    RETURN drawer_id;
END;
$$;

-- ============================================================================
-- PART 5: VERIFY CLEANUP
-- ============================================================================

-- 5.1: Check final state
SELECT 
    'Final cash drawer records:' as info,
    id,
    tenant_id,
    user_id,
    drawer_name,
    status,
    is_active,
    created_at
FROM public.cash_drawers
ORDER BY tenant_id, user_id, created_at;

-- 5.2: Verify no duplicates
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT tenant_id, user_id, COUNT(*) as count
        FROM public.cash_drawers
        WHERE is_active = true
        GROUP BY tenant_id, user_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE '✅ No duplicate active cash drawers found';
    ELSE
        RAISE NOTICE '❌ Still found % duplicate active cash drawers', duplicate_count;
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Cash drawer duplicates have been cleaned up and proper constraints are in place
