-- Fix product_migrations table structure
-- This script adds missing columns and ensures the table has the correct structure

-- First, let's check if the table exists and add missing columns
DO $$ 
BEGIN
    -- Add error_message column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN error_message TEXT;
        RAISE NOTICE 'Added error_message column to product_migrations table';
    END IF;

    -- Add completed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at column to product_migrations table';
    END IF;

    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to product_migrations table';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
        RAISE NOTICE 'Added updated_at column to product_migrations table';
    END IF;

    -- Add migration_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'migration_type'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN migration_type TEXT NOT NULL DEFAULT 'import' CHECK (migration_type IN ('import', 'export'));
        RAISE NOTICE 'Added migration_type column to product_migrations table';
    END IF;

    -- Add file_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'file_name'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN file_name TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added file_name column to product_migrations table';
    END IF;

    -- Add total_records column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'total_records'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN total_records INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added total_records column to product_migrations table';
    END IF;

    -- Add successful_records column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'successful_records'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN successful_records INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added successful_records column to product_migrations table';
    END IF;

    -- Add failed_records column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'failed_records'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN failed_records INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added failed_records column to product_migrations table';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_migrations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.product_migrations ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'));
        RAISE NOTICE 'Added status column to product_migrations table';
    END IF;

END $$;

-- Add comments for documentation
COMMENT ON TABLE public.product_migrations IS 'Tracks migration operations for products, contacts, and categories';
COMMENT ON COLUMN public.product_migrations.tenant_id IS 'Tenant ID for multi-tenancy';
COMMENT ON COLUMN public.product_migrations.migration_type IS 'Type of migration: import or export';
COMMENT ON COLUMN public.product_migrations.file_name IS 'Name of the file being processed';
COMMENT ON COLUMN public.product_migrations.total_records IS 'Total number of records in the file';
COMMENT ON COLUMN public.product_migrations.successful_records IS 'Number of successfully processed records';
COMMENT ON COLUMN public.product_migrations.failed_records IS 'Number of failed records';
COMMENT ON COLUMN public.product_migrations.status IS 'Current status of the migration';
COMMENT ON COLUMN public.product_migrations.error_message IS 'Error message if migration failed';
COMMENT ON COLUMN public.product_migrations.created_by IS 'User who initiated the migration';

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

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'product_migrations'
ORDER BY ordinal_position;
