-- ============================================================================
-- MIGRATION 1: SCHEMA FIXES
-- ============================================================================
-- This migration handles all schema changes (columns, tables, types)
-- Run this first, then run the functions/RLS migration

-- ============================================================================
-- PART 1: ENSURE REQUIRED SCHEMA ELEMENTS EXIST
-- ============================================================================

-- 1.1: Add tenant_id column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 1.2: Create tenant_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- 1.2.1: Add updated_at column if it doesn't exist (for existing tables)
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 1.3: Enable RLS on tenant_users table
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- 1.4: Create user_role enum if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN 
        CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'manager', 'cashier', 'user'); 
    END IF; 
END $$;

-- 1.5: Convert profiles.role column to user_role enum if it's still TEXT
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role' 
        AND data_type = 'text'
    ) THEN 
        ALTER TABLE public.profiles ALTER COLUMN role TYPE public.user_role USING CASE 
            WHEN role = 'superadmin' THEN 'superadmin'::public.user_role
            WHEN role = 'admin' THEN 'admin'::public.user_role
            WHEN role = 'manager' THEN 'manager'::public.user_role
            WHEN role = 'cashier' THEN 'cashier'::public.user_role
            ELSE 'user'::public.user_role
        END;
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user'::public.user_role;
    END IF; 
END $$;

-- 1.6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON public.tenant_users(role);

-- 1.7: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tenant_users
DROP TRIGGER IF EXISTS update_tenant_users_updated_at ON public.tenant_users;
CREATE TRIGGER update_tenant_users_updated_at
    BEFORE UPDATE ON public.tenant_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 2: ENSURE TENANT CREATORS HAVE ADMIN ROLES
-- ============================================================================

-- 2.1: Update existing tenant creators to have admin role in profiles
UPDATE public.profiles 
SET role = 'admin'::public.user_role
WHERE id IN (
    SELECT DISTINCT created_by 
    FROM public.tenants 
    WHERE created_by IS NOT NULL
)
AND (role IS NULL OR role = 'user'::public.user_role);

-- 2.2: Ensure tenant_users entries exist for tenant creators
INSERT INTO public.tenant_users (tenant_id, user_id, role)
SELECT 
    t.id as tenant_id,
    t.created_by as user_id,
    'admin' as role
FROM public.tenants t
WHERE t.created_by IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.tenant_users tu 
    WHERE tu.tenant_id = t.id AND tu.user_id = t.created_by
)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- ============================================================================
-- PART 3: CREATE BASIC RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- 3.1: Basic RLS policy for tenant_users table
DROP POLICY IF EXISTS "Users can view tenant_users for their tenant" ON public.tenant_users;
CREATE POLICY "Users can view tenant_users for their tenant" ON public.tenant_users
    FOR SELECT USING (
        tenant_id IN (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
            WHERE p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage tenant_users for their tenant" ON public.tenant_users;
CREATE POLICY "Admins can manage tenant_users for their tenant" ON public.tenant_users
    FOR ALL USING (
        tenant_id IN (
            SELECT COALESCE(p.tenant_id, tu.tenant_id)
            FROM public.profiles p
            LEFT JOIN public.tenant_users tu ON tu.user_id = p.id
            WHERE p.id = auth.uid()
            AND (p.role IN ('admin', 'superadmin') OR tu.role IN ('admin', 'superadmin'))
        )
    );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next: Run the functions and RLS policies migration
