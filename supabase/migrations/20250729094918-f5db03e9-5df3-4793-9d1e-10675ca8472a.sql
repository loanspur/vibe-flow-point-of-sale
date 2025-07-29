-- Update domain references from vibepos.shop to vibenet.shop

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_create_tenant_subdomain ON public.tenants;

-- Update the create_tenant_subdomain function
DROP FUNCTION IF EXISTS public.create_tenant_subdomain();

CREATE OR REPLACE FUNCTION public.create_tenant_subdomain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  subdomain_name TEXT;
  admin_user_id UUID;
BEGIN
  -- Get the admin user for this tenant
  SELECT user_id INTO admin_user_id 
  FROM tenant_users 
  WHERE tenant_id = NEW.id 
    AND role IN ('owner', 'admin') 
  LIMIT 1;
  
  -- If no admin found, use system fallback
  IF admin_user_id IS NULL THEN
    SELECT user_id INTO admin_user_id 
    FROM profiles 
    WHERE role = 'superadmin' 
    LIMIT 1;
  END IF;
  
  -- Generate subdomain from tenant name or ID - ENSURING .vibenet.shop domain
  IF NEW.name IS NOT NULL AND NEW.name != '' THEN
    subdomain_name := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g')) || '.vibenet.shop';
  ELSE
    subdomain_name := 'tenant-' || NEW.id || '.vibenet.shop';
  END IF;
  
  -- Insert subdomain entry
  INSERT INTO public.tenant_domains (
    tenant_id,
    domain_name,
    domain_type,
    status,
    is_primary,
    is_active,
    verified_at,
    created_by
  ) VALUES (
    NEW.id,
    subdomain_name,
    'subdomain',
    'verified',
    true,
    true,
    NOW(),
    admin_user_id
  );
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_create_tenant_subdomain
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.create_tenant_subdomain();

-- Update existing tenant domains that use vibepos.shop to vibenet.shop
UPDATE public.tenant_domains 
SET domain_name = REPLACE(domain_name, 'vibepos.shop', 'vibenet.shop')
WHERE domain_name LIKE '%.vibepos.shop';

-- Update the main domain entry if it exists
UPDATE public.tenant_domains 
SET domain_name = 'vibenet.shop'
WHERE domain_name = 'vibepos.shop';