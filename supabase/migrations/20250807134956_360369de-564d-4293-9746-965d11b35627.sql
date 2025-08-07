-- Fix the get_tenant_by_domain function to properly resolve subdomains
CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain_name_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_id_result UUID;
  subdomain_part text;
BEGIN
  -- First try to find exact domain match in tenant_domains
  SELECT tenant_id INTO tenant_id_result
  FROM tenant_domains
  WHERE domain_name = domain_name_param
    AND status = 'verified'
    AND is_active = true
  LIMIT 1;
  
  -- If not found and looks like a vibenet.shop subdomain, try resolving by tenant subdomain
  IF tenant_id_result IS NULL AND domain_name_param LIKE '%.vibenet.shop' AND domain_name_param != 'vibenet.shop' THEN
    -- Extract subdomain part (everything before .vibenet.shop)
    subdomain_part := split_part(domain_name_param, '.vibenet.shop', 1);
    
    -- Find tenant by subdomain field
    SELECT id INTO tenant_id_result
    FROM tenants
    WHERE subdomain = subdomain_part
      AND status = 'active'
    LIMIT 1;
    
    -- If still not found, try to find tenant by normalized name
    IF tenant_id_result IS NULL THEN
      SELECT id INTO tenant_id_result
      FROM tenants
      WHERE status = 'active'
        AND lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) = subdomain_part
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN tenant_id_result;
END;
$$;