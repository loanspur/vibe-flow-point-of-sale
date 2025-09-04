-- UNIFIED ROLE AND RLS POLICY FIX
-- This migration comprehensively fixes all role assignment and RLS policy issues
-- It addresses the root causes rather than applying ad-hoc fixes

-- ============================================================================
-- PART 0: ENSURE REQUIRED COLUMNS EXIST
-- ============================================================================

-- 0.1: Ensure tenant_id column exists in profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;
END $$;

-- 0.2: Ensure tenant_users table exists
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    invitation_status TEXT DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE,
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

-- 0.3: Enable RLS on tenant_users if not already enabled
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- 0.4: Ensure user_role enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'manager', 'cashier', 'user');
    END IF;
END $$;

-- 0.5: Ensure profiles.role column uses the enum type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
        AND data_type = 'text'
    ) THEN
        -- Convert text role column to user_role enum
        ALTER TABLE public.profiles 
        ALTER COLUMN role TYPE user_role USING 
          CASE 
            WHEN role = 'superadmin' THEN 'superadmin'::user_role
            WHEN role = 'admin' THEN 'admin'::user_role
            WHEN role = 'manager' THEN 'manager'::user_role
            WHEN role = 'cashier' THEN 'cashier'::user_role
            ELSE 'user'::user_role
          END;
        
        -- Set default value
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user'::user_role;
    END IF;
END $$;

-- ============================================================================
-- PART 1: FIX ROLE ASSIGNMENT SYSTEM
-- ============================================================================

-- 1.1: Fix the get_current_user_role function to properly handle role assignment
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val user_role;
  tenant_id_val UUID;
BEGIN
  -- First, try to get role from profiles table
  SELECT role, tenant_id INTO user_role_val, tenant_id_val
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- If no role found in profiles, check tenant_users table
  IF user_role_val IS NULL OR user_role_val = 'user' THEN
    SELECT 
      CASE 
        WHEN tu.role = 'admin' THEN 'admin'::user_role
        WHEN tu.role = 'manager' THEN 'manager'::user_role
        WHEN tu.role = 'cashier' THEN 'cashier'::user_role
        WHEN tu.role = 'owner' THEN 'admin'::user_role  -- Treat owner as admin
        WHEN tu.role = 'superadmin' THEN 'superadmin'::user_role
        ELSE 'user'::user_role
      END
    INTO user_role_val
    FROM tenant_users tu
    WHERE tu.user_id = auth.uid() 
      AND tu.is_active = true
      AND tu.tenant_id = tenant_id_val
    ORDER BY 
      CASE tu.role 
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'owner' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'cashier' THEN 4
        ELSE 5
      END
    LIMIT 1;
  END IF;
  
  -- Return the role, defaulting to 'user' if still null
  RETURN COALESCE(user_role_val, 'user'::user_role);
END;
$$;

-- 1.2: Create function to ensure tenant creators get admin role
CREATE OR REPLACE FUNCTION public.ensure_tenant_creator_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure the tenant creator has admin role in both profiles and tenant_users
  IF NEW.created_by IS NOT NULL THEN
    -- Update profiles table
    UPDATE profiles 
    SET 
      role = 'admin'::user_role,
      tenant_id = COALESCE(tenant_id, NEW.id),
      updated_at = now()
    WHERE user_id = NEW.created_by;
    
    -- Ensure tenant_users entry exists
    INSERT INTO tenant_users (tenant_id, user_id, role, is_active, invitation_status, created_at)
    VALUES (NEW.id, NEW.created_by, 'admin', true, 'accepted', now())
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      role = 'admin',
      is_active = true,
      invitation_status = 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 1.3: Create trigger to auto-assign admin role to tenant creators
DROP TRIGGER IF EXISTS ensure_tenant_creator_admin ON public.tenants;
CREATE TRIGGER ensure_tenant_creator_admin
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_tenant_creator_is_admin();

-- 1.4: Fix existing tenant creators who don't have admin role
UPDATE profiles 
SET role = 'admin'::user_role
WHERE user_id IN (
  SELECT DISTINCT created_by 
  FROM tenants 
  WHERE created_by IS NOT NULL
) AND (role IS NULL OR role = 'user'::user_role);

-- Ensure tenant_users entries exist for tenant creators
INSERT INTO tenant_users (tenant_id, user_id, role, is_active, invitation_status, created_at)
SELECT 
  t.id as tenant_id,
  t.created_by as user_id,
  'admin' as role,
  true as is_active,
  'accepted' as invitation_status,
  now() as created_at
FROM tenants t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_users tu 
    WHERE tu.tenant_id = t.id AND tu.user_id = t.created_by
  );

-- ============================================================================
-- PART 2: FIX ALL RLS POLICIES TO BE TENANT-AWARE AND PERMISSIVE
-- ============================================================================

-- 2.1: Create a unified RLS policy function
CREATE OR REPLACE FUNCTION public.is_tenant_member()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is a member of any tenant
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
      AND tenant_id IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
      AND is_active = true
  );
END;
$$;

-- 2.2: Fix payments table RLS policy
DROP POLICY IF EXISTS "Tenant staff can manage tenant payments" ON public.payments;
DROP POLICY IF EXISTS "Tenant users can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Tenant staff can view tenant payments" ON public.payments;

CREATE POLICY "Tenant members can view payments" 
ON public.payments
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

CREATE POLICY "Tenant members can manage payments" 
ON public.payments
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

-- 2.3: Fix accounting_transactions table RLS policy
DROP POLICY IF EXISTS "Tenant staff can manage accounting transactions" ON public.accounting_transactions;
DROP POLICY IF EXISTS "Tenant users can manage accounting transactions" ON public.accounting_transactions;
DROP POLICY IF EXISTS "Tenant staff can view accounting transactions" ON public.accounting_transactions;

CREATE POLICY "Tenant members can view accounting transactions" 
ON public.accounting_transactions
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

CREATE POLICY "Tenant members can manage accounting transactions" 
ON public.accounting_transactions
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

-- 2.4: Fix cash_transactions table RLS policy
DROP POLICY IF EXISTS "Tenant staff can manage cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Tenant users can manage cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Tenant staff can view cash transactions" ON public.cash_transactions;

CREATE POLICY "Tenant members can view cash transactions" 
ON public.cash_transactions
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

CREATE POLICY "Tenant members can manage cash transactions" 
ON public.cash_transactions
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

-- 2.5: Fix sales table RLS policy
DROP POLICY IF EXISTS "Tenant staff can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Tenant users can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Tenant staff can view sales" ON public.sales;

CREATE POLICY "Tenant members can view sales" 
ON public.sales
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

CREATE POLICY "Tenant members can manage sales" 
ON public.sales
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

-- 2.6: Fix sale_items table RLS policy
DROP POLICY IF EXISTS "Tenant staff can manage sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Tenant users can manage sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Tenant staff can view sale items" ON public.sale_items;

CREATE POLICY "Tenant members can view sale items" 
ON public.sale_items
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

CREATE POLICY "Tenant members can manage sale items" 
ON public.sale_items
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

-- 2.7: Fix payment_methods table RLS policy (consolidate all existing policies)
DROP POLICY IF EXISTS "Tenant managers can manage payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenant users can manage payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenant users can view payment methods" ON public.payment_methods;

CREATE POLICY "Tenant members can view payment methods" 
ON public.payment_methods
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

CREATE POLICY "Tenant members can manage payment methods" 
ON public.payment_methods
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND is_tenant_member()
);

-- ============================================================================
-- PART 3: FIX BUSINESS LOGIC AND ROLE PERSISTENCE
-- ============================================================================

-- 3.1: Update tenant creation process to ensure proper role assignment
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Setup default accounts
  PERFORM setup_default_accounts(NEW.id);
  
  -- Setup default features  
  PERFORM setup_tenant_default_features(NEW.id);
  
  -- Setup default user roles
  PERFORM setup_default_user_roles(NEW.id);
  
  -- Setup default business settings
  PERFORM setup_default_business_settings(NEW.id);
  
  -- Setup default payment methods (after accounts are created)
  PERFORM setup_default_payment_methods(NEW.id);
  
  -- Ensure tenant creator gets admin role (handled by trigger)
  
  RETURN NEW;
END;
$$;

-- 3.2: Create function to sync roles between profiles and tenant_users
CREATE OR REPLACE FUNCTION public.sync_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a profile is updated, sync to tenant_users
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    IF NEW.tenant_id IS NOT NULL THEN
      INSERT INTO tenant_users (tenant_id, user_id, role, is_active, invitation_status, created_at)
      VALUES (NEW.tenant_id, NEW.user_id, NEW.role::text, true, 'accepted', now())
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = NEW.role::text,
        is_active = true,
        invitation_status = 'accepted';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3.3: Create trigger to sync roles
DROP TRIGGER IF EXISTS sync_user_roles_trigger ON public.profiles;
CREATE TRIGGER sync_user_roles_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles();

-- ============================================================================
-- PART 4: ADD COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.get_current_user_role() 
IS 'Unified function to get user role from both profiles and tenant_users tables with proper fallback logic';

COMMENT ON FUNCTION public.is_tenant_member() 
IS 'Checks if current user is a member of any tenant for RLS policy evaluation';

COMMENT ON FUNCTION public.ensure_tenant_creator_is_admin() 
IS 'Ensures tenant creators automatically get admin role in both profiles and tenant_users tables';

COMMENT ON FUNCTION public.sync_user_roles() 
IS 'Syncs user roles between profiles and tenant_users tables to maintain consistency';

-- ============================================================================
-- PART 5: VERIFICATION QUERIES (for manual checking)
-- ============================================================================

-- Uncomment these queries to verify the fix:
/*
-- Check current user roles
SELECT 
  p.user_id,
  p.role as profile_role,
  p.tenant_id,
  tu.role as tenant_user_role,
  tu.is_active,
  au.email
FROM profiles p
LEFT JOIN tenant_users tu ON tu.user_id = p.user_id AND tu.tenant_id = p.tenant_id
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE p.tenant_id IS NOT NULL
ORDER BY p.tenant_id, p.role;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('payments', 'accounting_transactions', 'cash_transactions', 'sales', 'sale_items', 'payment_methods')
ORDER BY tablename, policyname;
*/
