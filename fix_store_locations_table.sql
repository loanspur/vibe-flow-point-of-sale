-- Fix Store Locations Table
-- This script ensures the store_locations table exists and has proper structure

-- Create store_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address_line_1 VARCHAR(500),
    address_line_2 VARCHAR(500),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_locations_tenant_id ON store_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_is_primary ON store_locations(is_primary);
CREATE INDEX IF NOT EXISTS idx_store_locations_is_active ON store_locations(is_active);

-- Enable Row Level Security
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view store locations for their tenant" ON store_locations;
CREATE POLICY "Users can view store locations for their tenant" ON store_locations
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert store locations for their tenant" ON store_locations;
CREATE POLICY "Users can insert store locations for their tenant" ON store_locations
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update store locations for their tenant" ON store_locations;
CREATE POLICY "Users can update store locations for their tenant" ON store_locations
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete store locations for their tenant" ON store_locations;
CREATE POLICY "Users can delete store locations for their tenant" ON store_locations
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_store_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_locations_updated_at ON store_locations;
CREATE TRIGGER trigger_update_store_locations_updated_at
    BEFORE UPDATE ON store_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_store_locations_updated_at();

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'store_locations' 
ORDER BY ordinal_position;

-- Check if there are any existing locations
SELECT COUNT(*) as existing_locations FROM store_locations;
