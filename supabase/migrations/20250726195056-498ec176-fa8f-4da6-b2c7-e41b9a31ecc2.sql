-- Fix the sync trigger function to handle missing updated_at column
CREATE OR REPLACE FUNCTION public.sync_profile_tenant_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      is_active = true;
  END IF;
  
  -- When tenant_id is removed from profile, deactivate tenant_users entry
  IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
    UPDATE tenant_users 
    SET is_active = false
    WHERE user_id = NEW.user_id AND tenant_id = OLD.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$function$;