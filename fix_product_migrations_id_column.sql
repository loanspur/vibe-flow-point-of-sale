-- Fix product_migrations table ID column issue
-- This script specifically addresses the "null value in column id" error

-- First, let's check the current state of the table
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

-- Fix the ID column if it doesn't have a proper default
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
    
    -- Ensure the table has all required columns
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
        ALTER TABLE public.product_migrations ADD COLUMN migration_type TEXT NOT NULL DEFAULT 'import' CHECK (migration_type IN ('import', 'export'));
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
        ALTER TABLE public.product_migrations ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'));
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

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_product_migrations_tenant_id ON public.product_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_migrations_status ON public.product_migrations(status);
CREATE INDEX IF NOT EXISTS idx_product_migrations_created_at ON public.product_migrations(created_at);
CREATE INDEX IF NOT EXISTS idx_product_migrations_type_status ON public.product_migrations(migration_type, status);

-- Enable RLS if not already enabled
ALTER TABLE public.product_migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their tenant's migrations" ON public.product_migrations;
DROP POLICY IF EXISTS "Users can insert migrations for their tenant" ON public.product_migrations;
DROP POLICY IF EXISTS "Users can update migrations for their tenant" ON public.product_migrations;

-- Create RLS policies
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

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_product_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_product_migrations_updated_at ON public.product_migrations;
CREATE TRIGGER update_product_migrations_updated_at
  BEFORE UPDATE ON public.product_migrations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_migrations_updated_at();

-- Verify the final table structure
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

-- Test insert to verify the fix works
INSERT INTO public.product_migrations (
  tenant_id,
  migration_type,
  file_name,
  total_records,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Test tenant ID
  'import',
  'test.csv',
  1,
  'pending'
) ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM public.product_migrations WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

SELECT 'Migration table fix completed successfully!' as status;
