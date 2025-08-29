-- Create product_migrations table for tracking migration operations
-- This table is required for the migration system to work properly

CREATE TABLE IF NOT EXISTS public.product_migrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  migration_type TEXT NOT NULL CHECK (migration_type IN ('import', 'export')),
  file_name TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_migrations_tenant_id ON public.product_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_migrations_status ON public.product_migrations(status);
CREATE INDEX IF NOT EXISTS idx_product_migrations_created_at ON public.product_migrations(created_at);
CREATE INDEX IF NOT EXISTS idx_product_migrations_type_status ON public.product_migrations(migration_type, status);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.product_migrations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their tenant's migrations
CREATE POLICY "Users can view their tenant's migrations" ON public.product_migrations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to insert migrations for their tenant
CREATE POLICY "Users can insert migrations for their tenant" ON public.product_migrations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to update migrations for their tenant
CREATE POLICY "Users can update migrations for their tenant" ON public.product_migrations
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_product_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_migrations_updated_at
  BEFORE UPDATE ON public.product_migrations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_migrations_updated_at();
