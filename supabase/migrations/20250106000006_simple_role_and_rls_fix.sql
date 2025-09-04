-- SIMPLE ROLE AND RLS POLICY FIX
-- This migration fixes role assignment and RLS policy issues with a simpler approach
-- It avoids complex schema checks and focuses on the core fixes

-- ============================================================================
-- PART 1: ENSURE BASIC SCHEMA ELEMENTS
-- ============================================================================

-- 1.1: Add tenant_id column to profiles table (ignore error if it exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 1.2: Create tenant_users table if it doesn't exist
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

-- 1.3: Enable RLS on tenant_users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- 1.4: Create user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'manager', 'cashier', 'user');
    END IF;
END $$;

-- ============================================================================
-- PART 2: FIX ROLE ASSIGNMENT SYSTEM
-- ============================================================================

-- 2.1: Drop existing function with all dependencies and create a simple get_current_user_role function
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
CREATE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val TEXT;
BEGIN
  -- First, try to get role from profiles table
  SELECT role::text INTO user_role_val
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- If no role found or role is 'user', check tenant_users table
  IF user_role_val IS NULL OR user_role_val = 'user' THEN
    SELECT tu.role INTO user_role_val
    FROM tenant_users tu
    WHERE tu.user_id = auth.uid() 
      AND tu.is_active = true
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
  RETURN COALESCE(user_role_val, 'user');
END;
$$;

-- 2.2: Drop existing function with all dependencies and create function to ensure tenant creators get admin role
DROP FUNCTION IF EXISTS public.ensure_tenant_creator_is_admin() CASCADE;
CREATE FUNCTION public.ensure_tenant_creator_is_admin()
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
      role = 'admin',
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

-- 2.3: Create trigger to auto-assign admin role to tenant creators
DROP TRIGGER IF EXISTS ensure_tenant_creator_admin ON public.tenants;
CREATE TRIGGER ensure_tenant_creator_admin
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_tenant_creator_is_admin();

-- 2.4: Fix existing tenant creators who don't have admin role
UPDATE profiles 
SET role = 'admin'
WHERE user_id IN (
  SELECT DISTINCT created_by 
  FROM tenants 
  WHERE created_by IS NOT NULL
) AND (role IS NULL OR role = 'user');

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
-- PART 3: FIX ALL RLS POLICIES TO BE TENANT-AWARE AND PERMISSIVE
-- ============================================================================

-- 3.1: Drop existing function with all dependencies and create a simple tenant membership check function
DROP FUNCTION IF EXISTS public.is_tenant_member() CASCADE;
CREATE FUNCTION public.is_tenant_member()
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

-- 3.2: Fix payments table RLS policy
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

-- 3.3: Fix accounting_transactions table RLS policy
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

-- 3.4: Fix cash_transactions table RLS policy
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

-- 3.5: Fix sales table RLS policy
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

-- 3.6: Fix sale_items table RLS policy
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

-- 3.7: Fix payment_methods table RLS policy
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
-- PART 4: ADD COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.get_current_user_role() 
IS 'Simple function to get user role from profiles or tenant_users tables';

COMMENT ON FUNCTION public.is_tenant_member() 
IS 'Checks if current user is a member of any tenant for RLS policy evaluation';

COMMENT ON FUNCTION public.ensure_tenant_creator_is_admin() 
IS 'Ensures tenant creators automatically get admin role in both profiles and tenant_users tables';
