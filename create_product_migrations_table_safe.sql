-- Create product_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    migration_type TEXT NOT NULL CHECK (migration_type IN ('import', 'export')),
    file_name TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_product_migrations_tenant_id ON product_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_migrations_created_at ON product_migrations(created_at);
CREATE INDEX IF NOT EXISTS idx_product_migrations_status ON product_migrations(status);

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_product_migrations_updated_at ON product_migrations;
CREATE TRIGGER update_product_migrations_updated_at
    BEFORE UPDATE ON product_migrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies if they don't exist
ALTER TABLE product_migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tenant migrations" ON product_migrations;
DROP POLICY IF EXISTS "Users can insert their own tenant migrations" ON product_migrations;
DROP POLICY IF EXISTS "Users can update their own tenant migrations" ON product_migrations;
DROP POLICY IF EXISTS "Users can delete their own tenant migrations" ON product_migrations;

-- Create new policies
CREATE POLICY "Users can view their own tenant migrations" ON product_migrations
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own tenant migrations" ON product_migrations
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own tenant migrations" ON product_migrations
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own tenant migrations" ON product_migrations
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );
