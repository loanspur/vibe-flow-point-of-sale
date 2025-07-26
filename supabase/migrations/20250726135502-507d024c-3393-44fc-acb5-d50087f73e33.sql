-- Drop triggers first, then recreate functions with proper search paths
DROP TRIGGER IF EXISTS sync_profile_tenant_users_trigger ON public.profiles;
DROP TRIGGER IF EXISTS sync_tenant_users_profile_trigger ON public.tenant_users;

-- Now drop and recreate the functions with proper search paths
DROP FUNCTION IF EXISTS public.sync_profile_tenant_users() CASCADE;
CREATE OR REPLACE FUNCTION public.sync_profile_tenant_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a profile is updated with a tenant_id, ensure tenant_users entry exists
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO tenant_users (tenant_id, user_id, role, is_active, created_at)
    VALUES (
      NEW.tenant_id,
      NEW.user_id,
      CASE 
        WHEN NEW.role = 'admin' THEN 'admin'
        WHEN NEW.role = 'manager' THEN 'manager'
        WHEN NEW.role = 'superadmin' THEN 'owner'
        ELSE 'user'
      END,
      true,
      now()
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      role = CASE 
        WHEN NEW.role = 'admin' THEN 'admin'
        WHEN NEW.role = 'manager' THEN 'manager'
        WHEN NEW.role = 'superadmin' THEN 'owner'
        ELSE 'user'
      END,
      is_active = true,
      updated_at = now();
  END IF;
  
  -- When tenant_id is removed from profile, deactivate tenant_users entry
  IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
    UPDATE tenant_users 
    SET is_active = false, updated_at = now()
    WHERE user_id = NEW.user_id AND tenant_id = OLD.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.sync_tenant_users_profile() CASCADE;
CREATE OR REPLACE FUNCTION public.sync_tenant_users_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a tenant_users entry is created, ensure profile has the tenant_id
  UPDATE profiles 
  SET tenant_id = NEW.tenant_id,
      role = CASE 
        WHEN NEW.role = 'owner' THEN 'admin'
        WHEN NEW.role = 'admin' THEN 'admin'
        WHEN NEW.role = 'manager' THEN 'manager'
        ELSE 'user'
      END::user_role,
      updated_at = now()
  WHERE user_id = NEW.user_id 
    AND (tenant_id IS NULL OR tenant_id != NEW.tenant_id);
    
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER sync_profile_tenant_users_trigger
  AFTER INSERT OR UPDATE OF tenant_id, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_tenant_users();

CREATE TRIGGER sync_tenant_users_profile_trigger
  AFTER INSERT OR UPDATE ON public.tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tenant_users_profile();