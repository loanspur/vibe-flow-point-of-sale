-- Create user_tenants table for multi-tenancy (safe version)
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

-- Create indexes for better performance (ignore if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_tenants_user_id') THEN
        CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_tenants_tenant_id') THEN
        CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_tenants_user_tenant') THEN
        CREATE INDEX idx_user_tenants_user_tenant ON user_tenants(user_id, tenant_id);
    END IF;
END $$;

-- Add RLS policies (ignore if exists)
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own tenant associations" ON user_tenants;
DROP POLICY IF EXISTS "Users can insert their own tenant associations" ON user_tenants;
DROP POLICY IF EXISTS "Users can update their own tenant associations" ON user_tenants;
DROP POLICY IF EXISTS "Users can delete their own tenant associations" ON user_tenants;

-- Create policies
CREATE POLICY "Users can view their own tenant associations" ON user_tenants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tenant associations" ON user_tenants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tenant associations" ON user_tenants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tenant associations" ON user_tenants
    FOR DELETE USING (user_id = auth.uid());

-- Create trigger function (ignore if exists)
CREATE OR REPLACE FUNCTION update_user_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (ignore if exists)
DROP TRIGGER IF EXISTS trigger_update_user_tenants_updated_at ON user_tenants;
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

