-- Create function to ensure all tenants have subdomains
CREATE OR REPLACE FUNCTION ensure_tenant_subdomain(tenant_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subdomain_name TEXT;
  admin_user_id UUID;
  existing_domain_id UUID;
  new_domain_id UUID;
BEGIN
  -- Check if tenant already has a subdomain
  SELECT id INTO existing_domain_id 
  FROM public.tenant_domains 
  WHERE tenant_id = tenant_id_param 
    AND domain_type = 'subdomain'
    AND domain_name LIKE '%.vibenet.shop'
  LIMIT 1;
  
  IF existing_domain_id IS NOT NULL THEN
    RETURN existing_domain_id;
  END IF;
  
  -- Get the admin user for this tenant
  SELECT user_id INTO admin_user_id 
  FROM tenant_users 
  WHERE tenant_id = tenant_id_param 
    AND role IN ('owner', 'admin') 
    AND is_active = true
  LIMIT 1;
  
  -- If no admin found, use system fallback
  IF admin_user_id IS NULL THEN
    SELECT user_id INTO admin_user_id 
    FROM profiles 
    WHERE role = 'superadmin' 
    LIMIT 1;
  END IF;
  
  -- Generate subdomain from tenant name or ID
  SELECT 
    CASE 
      WHEN t.name IS NOT NULL AND t.name != '' THEN
        lower(regexp_replace(regexp_replace(t.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '.vibenet.shop'
      ELSE
        'tenant-' || t.id || '.vibenet.shop'
    END
  INTO subdomain_name
  FROM tenants t
  WHERE t.id = tenant_id_param;
  
  -- Ensure subdomain is unique
  WHILE EXISTS (SELECT 1 FROM tenant_domains WHERE domain_name = subdomain_name) LOOP
    subdomain_name := 'tenant-' || tenant_id_param || '-' || floor(random() * 1000) || '.vibenet.shop';
  END LOOP;
  
  -- Insert subdomain entry
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
    tenant_id_param,
    subdomain_name,
    'subdomain',
    'verified',
    'issued',
    true,
    true,
    NOW(),
    NOW(),
    admin_user_id
  ) RETURNING id INTO new_domain_id;
  
  RETURN new_domain_id;
END;
$$;

-- Update the tenant creation trigger to ensure subdomain creation
CREATE OR REPLACE FUNCTION create_tenant_subdomain()
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
    subdomain_name := lower(regexp_replace(regexp_replace(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '.vibenet.shop';
  ELSE
    subdomain_name := 'tenant-' || NEW.id || '.vibenet.shop';
  END IF;
  
  -- Ensure subdomain is unique
  WHILE EXISTS (SELECT 1 FROM tenant_domains WHERE domain_name = subdomain_name) LOOP
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

-- Create function to fix existing tenants without subdomains
CREATE OR REPLACE FUNCTION fix_tenants_without_subdomains()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  fixed_count INTEGER := 0;
BEGIN
  FOR tenant_record IN 
    SELECT t.id, t.name 
    FROM tenants t 
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_domains td 
      WHERE td.tenant_id = t.id 
        AND td.domain_type = 'subdomain'
        AND td.domain_name LIKE '%.vibenet.shop'
    )
  LOOP
    PERFORM ensure_tenant_subdomain(tenant_record.id);
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RETURN fixed_count;
END;
$$;