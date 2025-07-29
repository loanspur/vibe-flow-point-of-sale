-- Fix invalid subdomain names
UPDATE public.tenant_domains 
SET domain_name = 'traction-energies.vibenet.shop'
WHERE domain_name = 'traction-energies-.vibenet.shop';

UPDATE public.tenant_domains 
SET domain_name = 'walela-wines-spirits.vibenet.shop'
WHERE domain_name = 'walela-wines---spirits.vibenet.shop';

-- Update the tenant subdomain creation function to prevent invalid names
CREATE OR REPLACE FUNCTION create_tenant_subdomain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  subdomain_name TEXT;
  admin_user_id UUID;
  clean_name TEXT;
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
  
  -- Clean and generate subdomain from tenant name or ID
  IF NEW.name IS NOT NULL AND NEW.name != '' THEN
    -- Clean the name: remove special chars, replace spaces with hyphens, remove trailing hyphens
    clean_name := lower(regexp_replace(regexp_replace(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
    clean_name := regexp_replace(clean_name, '-+', '-', 'g'); -- Replace multiple hyphens with single
    clean_name := regexp_replace(clean_name, '^-|-$', '', 'g'); -- Remove leading/trailing hyphens
    subdomain_name := clean_name || '.vibenet.shop';
  ELSE
    subdomain_name := 'tenant-' || NEW.id || '.vibenet.shop';
  END IF;
  
  -- Ensure subdomain is unique and valid
  WHILE EXISTS (SELECT 1 FROM tenant_domains WHERE domain_name = subdomain_name) 
        OR length(split_part(subdomain_name, '.', 1)) < 3 
        OR subdomain_name ~ '^-|-\.' LOOP
    subdomain_name := 'tenant-' || NEW.id || '-' || floor(random() * 1000) || '.vibenet.shop';
  END LOOP;
  
  -- Insert subdomain entry with SSL already issued (wildcard SSL covers all)
  INSERT INTO public.tenant_domains (
    tenant_id,
    domain_name,
    domain_type,
    status,
    ssl_status,
    is_primary,
    is_active,
    verified_at,
    ssl_issued_at,
    created_by
  ) VALUES (
    NEW.id,
    subdomain_name,
    'subdomain',
    'verified',
    'issued',
    true,
    true,
    NOW(),
    NOW(),
    admin_user_id
  );
  
  RETURN NEW;
END;
$function$;