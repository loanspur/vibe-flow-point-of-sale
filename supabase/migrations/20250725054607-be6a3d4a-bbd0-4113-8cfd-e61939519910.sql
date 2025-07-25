-- Fix security warnings by updating all functions to include search_path parameter
-- This prevents search path injection attacks

-- Function 1: create_superadmin_profile
CREATE OR REPLACE FUNCTION public.create_superadmin_profile()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Update any existing profile with admin@vibepos.com email to superadmin role
  UPDATE public.profiles 
  SET role = 'superadmin'::user_role, full_name = 'Super Administrator'
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@vibepos.com'
  );
END;
$function$;

-- Function 2: get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Function 3: get_user_tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT tenant_id FROM public.tenant_users 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$function$;

-- Function 4: is_tenant_admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner') 
    AND is_active = true
  );
$function$;