-- Fix the security warnings by setting proper search paths for the new functions
DROP FUNCTION IF EXISTS public.sync_profile_tenant_users();
CREATE OR REPLACE FUNCTION public.sync_profile_tenant_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a profile is updated with a tenant_id, ensure tenant_users entry exists
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active, created_at)
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
    UPDATE public.tenant_users 
    SET is_active = false, updated_at = now()
    WHERE user_id = NEW.user_id AND tenant_id = OLD.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.sync_tenant_users_profile();
CREATE OR REPLACE FUNCTION public.sync_tenant_users_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a tenant_users entry is created, ensure profile has the tenant_id
  UPDATE public.profiles 
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