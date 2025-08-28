-- Create user_tenants table for multi-tenancy
CREATE TABLE IF NOT EXISTS user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_tenant ON user_tenants(user_id, tenant_id);

-- Add RLS policies
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own tenant associations
CREATE POLICY "Users can view their own tenant associations" ON user_tenants
    FOR SELECT USING (user_id = auth.uid());

-- Policy for users to insert their own tenant associations
CREATE POLICY "Users can insert their own tenant associations" ON user_tenants
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own tenant associations
CREATE POLICY "Users can update their own tenant associations" ON user_tenants
    FOR UPDATE USING (user_id = auth.uid());

-- Policy for users to delete their own tenant associations
CREATE POLICY "Users can delete their own tenant associations" ON user_tenants
    FOR DELETE USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_tenants_updated_at
    BEFORE UPDATE ON user_tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tenants_updated_at();

-- Insert current user-tenant relationships if they don't exist
-- This assumes you have existing users and tenants
INSERT INTO user_tenants (user_id, tenant_id, role)
SELECT DISTINCT 
    u.id as user_id,
    t.id as tenant_id,
    'admin' as role
FROM auth.users u
CROSS JOIN tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM user_tenants ut 
    WHERE ut.user_id = u.id AND ut.tenant_id = t.id
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;
