-- Function to get tenant by domain name (subdomain or custom domain)
CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(domain_name_param text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_id_result UUID;
BEGIN
  -- First try to find exact domain match
  SELECT tenant_id INTO tenant_id_result
  FROM public.tenant_domains
  WHERE domain_name = domain_name_param
    AND status = 'verified'
    AND is_active = true
  LIMIT 1;
  
  -- If not found and looks like a subdomain, try extracting tenant from subdomain name
  IF tenant_id_result IS NULL AND domain_name_param LIKE '%.vibenet.shop' THEN
    -- Extract subdomain part
    DECLARE
      subdomain_part text;
    BEGIN
      subdomain_part := split_part(domain_name_param, '.vibenet.shop', 1);
      
      -- Try to find tenant by subdomain pattern
      SELECT tenant_id INTO tenant_id_result
      FROM public.tenant_domains
      WHERE domain_name = domain_name_param
        AND domain_type = 'subdomain'
        AND status = 'verified'
        AND is_active = true
      LIMIT 1;
      
      -- If still not found, try to find tenant by name pattern
      IF tenant_id_result IS NULL THEN
        SELECT t.id INTO tenant_id_result
        FROM public.tenants t
        WHERE t.status = 'active'
          AND (
            lower(regexp_replace(regexp_replace(t.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) = subdomain_part
            OR t.subdomain = subdomain_part
          )
        LIMIT 1;
      END IF;
    END;
  END IF;
  
  RETURN tenant_id_result;
END;
$function$;