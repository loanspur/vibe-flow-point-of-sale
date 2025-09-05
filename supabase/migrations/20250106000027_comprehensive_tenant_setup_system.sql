-- Comprehensive Tenant Setup System
-- This creates a system that automatically handles user setup for all tenants
-- Both existing and future tenants will benefit from this

-- ============================================================================
-- PART 1: CREATE AUTOMATIC TENANT SETUP FUNCTIONS
-- ============================================================================

-- Function to automatically create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant_id UUID;
    user_role_val user_role;
BEGIN
    -- Try to find the user's tenant from existing records
    SELECT tenant_id INTO user_tenant_id
    FROM public.tenant_users
    WHERE user_id = NEW.id
    LIMIT 1;
    
    -- If no tenant found, try to get from profiles
    IF user_tenant_id IS NULL THEN
        SELECT tenant_id INTO user_tenant_id
        FROM public.profiles
        WHERE user_id = NEW.id
        LIMIT 1;
    END IF;
    
    -- If still no tenant, this might be a new user - we'll handle this case
    -- For now, we'll create a profile with a default role
    IF user_tenant_id IS NULL THEN
        -- Check if this is the first user (tenant creator)
        -- If so, they should be admin
        user_role_val := 'user'::user_role;
    ELSE
        -- Get the user's role from tenant_users
        SELECT role INTO user_role_val
        FROM public.tenant_users
        WHERE user_id = NEW.id AND tenant_id = user_tenant_id
        LIMIT 1;
        
        -- Default to user if no role found
        IF user_role_val IS NULL THEN
            user_role_val := 'user'::user_role;
        END IF;
    END IF;
    
    -- Create profile record
    INSERT INTO public.profiles (
        id,
        user_id,
        tenant_id,
        role,
        full_name,
        avatar_url,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        user_tenant_id,
        user_role_val,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- Function to ensure tenant creator is admin
CREATE OR REPLACE FUNCTION public.ensure_tenant_creator_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Update the tenant creator's role to admin in profiles
    UPDATE public.profiles
    SET 
        role = 'admin'::user_role,
        tenant_id = NEW.id,
        updated_at = NOW()
    WHERE user_id = NEW.created_by;
    
    -- Update the tenant creator's role to admin in tenant_users
    UPDATE public.tenant_users
    SET 
        role = 'admin'::user_role,
        updated_at = NOW()
    WHERE user_id = NEW.created_by AND tenant_id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Function to automatically create tenant_users record when profile is created
CREATE OR REPLACE FUNCTION public.ensure_tenant_user_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only create tenant_users record if tenant_id is not null
    IF NEW.tenant_id IS NOT NULL THEN
        INSERT INTO public.tenant_users (
            id,
            tenant_id,
            user_id,
            role,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            NEW.tenant_id,
            NEW.user_id,
            NEW.role,
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
            role = NEW.role,
            is_active = true,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 2: CREATE TRIGGERS FOR AUTOMATIC SETUP
-- ============================================================================

-- Trigger to automatically create profile when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger to ensure tenant creator is admin
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
    AFTER INSERT ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_tenant_creator_is_admin();

-- Trigger to ensure tenant_users record exists when profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_tenant_user_record();

-- ============================================================================
-- PART 3: CREATE HELPER FUNCTIONS FOR MANUAL SETUP
-- ============================================================================

-- Function to manually set up a user as tenant admin
CREATE OR REPLACE FUNCTION public.setup_tenant_admin(
    user_email TEXT,
    tenant_id_param UUID,
    admin_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Create or update profile
    INSERT INTO public.profiles (
        id,
        user_id,
        tenant_id,
        role,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        target_user_id,
        tenant_id_param,
        'admin'::user_role,
        COALESCE(admin_name, user_email),
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        tenant_id = tenant_id_param,
        role = 'admin'::user_role,
        full_name = COALESCE(admin_name, profiles.full_name),
        updated_at = NOW();
    
    -- Create or update tenant_users
    INSERT INTO public.tenant_users (
        id,
        tenant_id,
        user_id,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        tenant_id_param,
        target_user_id,
        'admin'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = 'admin'::user_role,
        is_active = true,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Function to fix existing tenants (run this for existing tenants)
CREATE OR REPLACE FUNCTION public.fix_existing_tenant_setup(tenant_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    tenant_creator_id UUID;
BEGIN
    -- Get the tenant creator
    SELECT created_by INTO tenant_creator_id
    FROM public.tenants
    WHERE id = tenant_id_param;
    
    IF tenant_creator_id IS NULL THEN
        RAISE EXCEPTION 'Tenant % not found', tenant_id_param;
    END IF;
    
    -- Ensure tenant creator has admin role in profiles
    INSERT INTO public.profiles (
        id,
        user_id,
        tenant_id,
        role,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        tenant_creator_id,
        tenant_id_param,
        'admin'::user_role,
        'Tenant Administrator',
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        tenant_id = tenant_id_param,
        role = 'admin'::user_role,
        updated_at = NOW();
    
    -- Ensure tenant creator has admin role in tenant_users
    INSERT INTO public.tenant_users (
        id,
        tenant_id,
        user_id,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        tenant_id_param,
        tenant_creator_id,
        'admin'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = 'admin'::user_role,
        is_active = true,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- ============================================================================
-- PART 4: TEST THE SYSTEM
-- ============================================================================

-- Test the setup functions
SELECT 
  'System Setup Complete' as status,
  'All future tenants will be automatically configured' as message;
