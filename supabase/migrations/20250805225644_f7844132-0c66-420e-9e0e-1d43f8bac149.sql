-- Security Fix: Add search_path to all database functions for security
-- This prevents potential security vulnerabilities from path-based attacks

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$function$;

-- Fix get_user_tenant_id function  
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT tenant_id FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$function$;

-- Fix is_tenant_admin function
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner') 
    AND is_active = true
  );
$function$;

-- Fix get_current_application_version function
CREATE OR REPLACE FUNCTION public.get_current_application_version()
RETURNS TABLE(version_number text, version_name text, release_date date, build_number integer, is_stable boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    av.version_number,
    av.version_name,
    av.release_date,
    av.build_number,
    av.is_stable
  FROM application_versions av
  WHERE av.is_current = true
  LIMIT 1;
END;
$function$;

-- Fix track_product_changes function
CREATE OR REPLACE FUNCTION public.track_product_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_id_val UUID;
  changed_fields JSONB := '{}';
  field_name TEXT;
  old_val JSONB;
  new_val JSONB;
BEGIN
  -- Get tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    tenant_id_val := OLD.tenant_id;
  ELSE
    tenant_id_val := NEW.tenant_id;
  END IF;

  -- Handle different operations
  IF TG_OP = 'INSERT' THEN
    -- Track product creation
    INSERT INTO product_history (
      tenant_id, product_id, action_type, new_value, changed_by, metadata
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'created',
      to_jsonb(NEW),
      auth.uid(),
      jsonb_build_object('operation', 'INSERT')
    );
  
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track specific field changes
    FOR field_name IN 
      SELECT unnest(ARRAY['name', 'description', 'sku', 'price', 'stock_quantity', 'min_stock_level', 'is_active', 'category_id', 'brand_id'])
    LOOP
      -- Get old and new values for the field
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name) INTO old_val USING OLD;
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name) INTO new_val USING NEW;
      
      -- If values are different, record the change
      IF old_val IS DISTINCT FROM new_val THEN
        INSERT INTO product_history (
          tenant_id, product_id, action_type, field_changed, old_value, new_value, changed_by, metadata
        ) VALUES (
          NEW.tenant_id,
          NEW.id,
          CASE 
            WHEN field_name = 'price' THEN 'price_change'
            WHEN field_name = 'stock_quantity' THEN 'stock_adjustment'
            WHEN field_name = 'is_active' THEN 'status_change'
            ELSE 'updated'
          END,
          field_name,
          old_val,
          new_val,
          auth.uid(),
          jsonb_build_object('operation', 'UPDATE', 'field', field_name)
        );
      END IF;
    END LOOP;
  
  ELSIF TG_OP = 'DELETE' THEN
    -- Track product deletion
    INSERT INTO product_history (
      tenant_id, product_id, action_type, old_value, changed_by, metadata
    ) VALUES (
      OLD.tenant_id,
      OLD.id,
      'deleted',
      to_jsonb(OLD),
      auth.uid(),
      jsonb_build_object('operation', 'DELETE')
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix generate_otp_code function
CREATE OR REPLACE FUNCTION public.generate_otp_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$function$;

-- Fix create_otp_verification function - REDUCE EXPIRY TO 5 MINUTES FOR SECURITY
CREATE OR REPLACE FUNCTION public.create_otp_verification(user_id_param uuid, email_param text, otp_type_param text)
RETURNS TABLE(otp_code text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_otp TEXT;
  expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate OTP and set expiry (5 minutes for security)
  generated_otp := generate_otp_code();
  expiry_time := now() + INTERVAL '5 minutes';
  
  -- Clean up old unused OTPs for this user and type
  DELETE FROM email_verification_otps 
  WHERE user_id = user_id_param 
    AND otp_type = otp_type_param 
    AND used_at IS NULL;
  
  -- Insert new OTP
  INSERT INTO email_verification_otps (
    user_id, email, otp_code, otp_type, expires_at
  ) VALUES (
    user_id_param, email_param, generated_otp, otp_type_param, expiry_time
  );
  
  RETURN QUERY SELECT generated_otp, expiry_time;
END;
$function$;

-- Fix verify_otp_code function
CREATE OR REPLACE FUNCTION public.verify_otp_code(user_id_param uuid, otp_code_param text, otp_type_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  otp_record RECORD;
BEGIN
  -- Find valid OTP
  SELECT * INTO otp_record
  FROM email_verification_otps
  WHERE user_id = user_id_param
    AND otp_code = otp_code_param
    AND otp_type = otp_type_param
    AND expires_at > now()
    AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark OTP as used
  UPDATE email_verification_otps
  SET used_at = now()
  WHERE id = otp_record.id;
  
  -- If email verification, update profile
  IF otp_type_param = 'email_verification' THEN
    UPDATE profiles
    SET email_verified = true,
        email_verified_at = now()
    WHERE user_id = user_id_param;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix get_user_permissions function
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id_param uuid)
RETURNS TABLE(resource permission_resource, action permission_action, permission_name text, category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT sp.resource, sp.action, sp.name, sp.category
    FROM role_permissions rp
    JOIN user_role_assignments ura ON rp.role_id = ura.role_id
    JOIN system_permissions sp ON rp.permission_id = sp.id
    WHERE ura.user_id = user_id_param
    AND ura.is_active = true
    AND rp.granted = true
    ORDER BY sp.category, sp.resource, sp.action;
$function$;

-- Fix user_has_permission function
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id_param uuid, resource_param permission_resource, action_param permission_action)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM role_permissions rp
        JOIN user_role_assignments ura ON rp.role_id = ura.role_id
        JOIN system_permissions sp ON rp.permission_id = sp.id
        WHERE ura.user_id = user_id_param
        AND ura.is_active = true
        AND sp.resource = resource_param
        AND sp.action = action_param
        AND rp.granted = true
    );
$function$;

-- Fix get_user_contact_profile function
CREATE OR REPLACE FUNCTION public.get_user_contact_profile()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id FROM contacts 
  WHERE user_id = auth.uid() 
  AND tenant_id = get_user_tenant_id()
  LIMIT 1;
$function$;

-- Fix get_tenant_by_domain function
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
  FROM tenant_domains
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
      FROM tenant_domains
      WHERE domain_name = domain_name_param
        AND domain_type = 'subdomain'
        AND status = 'verified'
        AND is_active = true
      LIMIT 1;
      
      -- If still not found, try to find tenant by name pattern
      IF tenant_id_result IS NULL THEN
        SELECT t.id INTO tenant_id_result
        FROM tenants t
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

-- Fix is_domain_available function
CREATE OR REPLACE FUNCTION public.is_domain_available(domain_name_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM tenant_domains 
    WHERE domain_name = domain_name_param 
    AND is_active = true
  );
END;
$function$;