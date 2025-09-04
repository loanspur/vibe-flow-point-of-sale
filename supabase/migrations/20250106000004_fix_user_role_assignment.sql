-- Fix User Role Assignment
-- This migration ensures that tenant admins have the correct role in the profiles table
-- The issue is that users are showing as 'user' instead of 'admin' in get_current_user_role()

-- First, let's check what roles exist in the profiles table
-- This is for debugging purposes - you can run this query manually to see current roles
/*
SELECT 
    p.user_id,
    p.full_name,
    p.role,
    p.tenant_id,
    au.email
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE p.tenant_id IS NOT NULL
ORDER BY p.tenant_id, p.role;
*/

-- Function to safely update user role to admin
CREATE OR REPLACE FUNCTION public.ensure_user_is_admin(
    target_user_id UUID,
    target_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Update the user's role to admin if they don't already have an admin role
    UPDATE public.profiles 
    SET 
        role = 'admin'::user_role,
        tenant_id = COALESCE(tenant_id, target_tenant_id),
        updated_at = now()
    WHERE user_id = target_user_id
    AND (role IS NULL OR role = 'user'::user_role);
    
    -- If no profile exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.profiles (user_id, role, tenant_id, full_name)
        VALUES (target_user_id, 'admin'::user_role, target_tenant_id, 'Administrator')
        ON CONFLICT (user_id) DO UPDATE SET
            role = 'admin'::user_role,
            tenant_id = COALESCE(profiles.tenant_id, target_tenant_id),
            updated_at = now();
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to get current user's tenant ID (helper function)
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    tenant_id_val UUID;
BEGIN
    SELECT tenant_id INTO tenant_id_val
    FROM profiles
    WHERE user_id = auth.uid();
    
    RETURN tenant_id_val;
END;
$$;

-- Function to automatically assign admin role to tenant creators
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- If this is a new tenant, make the creator an admin
    IF TG_OP = 'INSERT' THEN
        PERFORM ensure_user_is_admin(NEW.created_by, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to auto-assign admin role to tenant creators
DROP TRIGGER IF EXISTS auto_assign_admin_on_tenant_creation ON public.tenants;
CREATE TRIGGER auto_assign_admin_on_tenant_creation
    AFTER INSERT ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_admin_role();

-- Add comment for documentation
COMMENT ON FUNCTION public.ensure_user_is_admin(UUID, UUID) 
IS 'Safely updates a user role to admin for a specific tenant';

COMMENT ON FUNCTION public.auto_assign_admin_role() 
IS 'Automatically assigns admin role to users who create tenants';
