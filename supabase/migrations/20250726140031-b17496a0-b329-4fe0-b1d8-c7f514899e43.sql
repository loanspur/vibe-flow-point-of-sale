-- Fix more important functions and then let's tackle the remaining systematically

-- Fix get user permissions function
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

-- Fix user has feature access function
CREATE OR REPLACE FUNCTION public.user_has_feature_access(user_tenant_id uuid, feature_name_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM tenant_feature_access
    WHERE tenant_id = user_tenant_id 
      AND feature_name = feature_name_param 
      AND is_enabled = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$function$;

-- Fix get user feature access function  
CREATE OR REPLACE FUNCTION public.get_user_feature_access(user_tenant_id uuid)
RETURNS TABLE(feature_name text, is_enabled boolean, expires_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT tfa.feature_name, tfa.is_enabled, tfa.expires_at
  FROM tenant_feature_access tfa
  WHERE tfa.tenant_id = user_tenant_id;
$function$;

-- Fix create superadmin profile function
CREATE OR REPLACE FUNCTION public.create_superadmin_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update any existing profile with admin@vibepos.com email to superadmin role
  UPDATE profiles 
  SET role = 'superadmin'::user_role, full_name = 'Super Administrator'
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@vibepos.com'
  );
END;
$function$;

-- Let's fix key inventory and stock functions too
CREATE OR REPLACE FUNCTION public.update_product_stock(product_id uuid, quantity_sold integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products 
  SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
  WHERE id = product_id;
END;
$function$;