-- Comprehensive fix for product_migrations table
-- This script fixes both the ID column and constraint issues

-- Step 1: Check current table state
SELECT 
  'Current table structure:' as info,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'product_migrations'
ORDER BY ordinal_position;

-- Step 2: Fix the ID column issue
DO $$ 
BEGIN
    -- Check if the id column exists and fix it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'id'
    ) THEN
        -- Check if the id column has a default value
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'product_migrations' 
            AND column_name = 'id'
            AND column_default IS NOT NULL
        ) THEN
            -- Add default value to id column
            ALTER TABLE public.product_migrations 
            ALTER COLUMN id SET DEFAULT gen_random_uuid();
            
            RAISE NOTICE 'Added default value to id column';
        ELSE
            RAISE NOTICE 'ID column already has a default value';
        END IF;
    ELSE
        -- If id column doesn't exist, add it
        ALTER TABLE public.product_migrations 
        ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
        
        RAISE NOTICE 'Added id column with default value';
    END IF;
END $$;

-- Step 3: Fix constraint issues
-- Drop existing constraints that might be causing issues
ALTER TABLE public.product_migrations 
DROP CONSTRAINT IF EXISTS product_migrations_status_check;

ALTER TABLE public.product_migrations 
DROP CONSTRAINT IF EXISTS product_migrations_migration_type_check;

-- Recreate constraints with correct values
ALTER TABLE public.product_migrations 
ADD CONSTRAINT product_migrations_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'));

ALTER TABLE public.product_migrations 
ADD CONSTRAINT product_migrations_migration_type_check 
CHECK (migration_type IN ('import', 'export'));

-- Step 4: Ensure all required columns exist
DO $$ 
BEGIN
    -- Add tenant_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN tenant_id UUID NOT NULL;
        RAISE NOTICE 'Added tenant_id column';
    END IF;
    
    -- Add created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- Add migration_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'migration_type'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN migration_type TEXT NOT NULL DEFAULT 'import';
        RAISE NOTICE 'Added migration_type column';
    END IF;
    
    -- Add file_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'file_name'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN file_name TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added file_name column';
    END IF;
    
    -- Add total_records if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'total_records'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN total_records INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added total_records column';
    END IF;
    
    -- Add successful_records if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'successful_records'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN successful_records INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added successful_records column';
    END IF;
    
    -- Add failed_records if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'failed_records'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN failed_records INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added failed_records column';
    END IF;
    
    -- Add status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        RAISE NOTICE 'Added status column';
    END IF;
    
    -- Add error_message if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN error_message TEXT;
        RAISE NOTICE 'Added error_message column';
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at column';
    END IF;
    
    -- Add created_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column';
    END IF;
    
END $$;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_migrations_tenant_id ON public.product_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_migrations_status ON public.product_migrations(status);
CREATE INDEX IF NOT EXISTS idx_product_migrations_created_at ON public.product_migrations(created_at);
CREATE INDEX IF NOT EXISTS idx_product_migrations_type_status ON public.product_migrations(migration_type, status);

-- Step 6: Enable RLS
ALTER TABLE public.product_migrations ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
DROP POLICY IF EXISTS "Users can view their tenant's migrations" ON public.product_migrations;
DROP POLICY IF EXISTS "Users can insert migrations for their tenant" ON public.product_migrations;
DROP POLICY IF EXISTS "Users can update migrations for their tenant" ON public.product_migrations;

CREATE POLICY "Users can view their tenant's migrations" ON public.product_migrations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert migrations for their tenant" ON public.product_migrations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update migrations for their tenant" ON public.product_migrations
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Step 8: Create trigger
CREATE OR REPLACE FUNCTION update_product_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_migrations_updated_at ON public.product_migrations;
CREATE TRIGGER update_product_migrations_updated_at
  BEFORE UPDATE ON public.product_migrations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_migrations_updated_at();

-- Step 9: Verify the fix
SELECT 
  'Final table structure:' as info,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'product_migrations'
ORDER BY ordinal_position;

-- Step 10: Test insert
DO $$
BEGIN
  INSERT INTO public.product_migrations (
    tenant_id,
    migration_type,
    file_name,
    total_records,
    status
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'import',
    'test.csv',
    1,
    'pending'
  );
  
  RAISE NOTICE 'Test insert successful!';
  
  -- Clean up test data
  DELETE FROM public.product_migrations WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert failed with error: %', SQLERRM;
END $$;

SELECT 'Comprehensive migration table fix completed successfully!' as status;
