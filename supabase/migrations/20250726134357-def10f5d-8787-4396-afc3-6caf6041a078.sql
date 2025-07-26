-- Create missing tenant_users entries for any users who have tenant_id in profiles but not in tenant_users
INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active, created_at)
SELECT 
  p.tenant_id,
  p.user_id,
  CASE 
    WHEN p.role = 'admin' THEN 'admin'
    WHEN p.role = 'manager' THEN 'manager'
    WHEN p.role = 'superadmin' THEN 'owner'
    ELSE 'user'
  END as role,
  true as is_active,
  now() as created_at
FROM profiles p
LEFT JOIN tenant_users tu ON p.user_id = tu.user_id AND p.tenant_id = tu.tenant_id
WHERE p.tenant_id IS NOT NULL 
  AND tu.user_id IS NULL
  AND EXISTS (SELECT 1 FROM tenants t WHERE t.id = p.tenant_id);

-- Create a function to ensure profile and tenant_users consistency
CREATE OR REPLACE FUNCTION public.sync_profile_tenant_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to maintain consistency
DROP TRIGGER IF EXISTS sync_profile_tenant_users_trigger ON public.profiles;
CREATE TRIGGER sync_profile_tenant_users_trigger
  AFTER INSERT OR UPDATE OF tenant_id, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_tenant_users();

-- Also create a function to ensure consistency when inserting into tenant_users
CREATE OR REPLACE FUNCTION public.sync_tenant_users_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for tenant_users table
DROP TRIGGER IF EXISTS sync_tenant_users_profile_trigger ON public.tenant_users;
CREATE TRIGGER sync_tenant_users_profile_trigger
  AFTER INSERT OR UPDATE ON public.tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tenant_users_profile();