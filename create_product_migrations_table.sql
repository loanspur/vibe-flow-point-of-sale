-- Create product_migrations table for tracking migration history
CREATE TABLE IF NOT EXISTS product_migrations (
    id TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    migration_type TEXT NOT NULL DEFAULT 'product_import',
    file_name TEXT NOT NULL,
    total_records INTEGER NOT NULL DEFAULT 0,
    successful_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    errors TEXT[] DEFAULT '{}',
    can_rollback BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_migrations_tenant_id ON product_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_migrations_created_at ON product_migrations(created_at DESC);

-- Add RLS policies
ALTER TABLE product_migrations ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their tenant's migrations
CREATE POLICY "Users can view their tenant's product migrations" ON product_migrations
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));

-- Policy for users to insert migrations for their tenant
CREATE POLICY "Users can insert product migrations for their tenant" ON product_migrations
    FOR INSERT WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));

-- Policy for users to update migrations for their tenant
CREATE POLICY "Users can update their tenant's product migrations" ON product_migrations
    FOR UPDATE USING (tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));

-- Policy for users to delete migrations for their tenant
CREATE POLICY "Users can delete their tenant's product migrations" ON product_migrations
    FOR DELETE USING (tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_migrations_updated_at
    BEFORE UPDATE ON product_migrations
    FOR EACH ROW
    EXECUTE FUNCTION update_product_migrations_updated_at();
