-- Fix the final remaining function search path issues (batch final)

-- Fix remaining utility and complex functions
CREATE OR REPLACE FUNCTION public.copy_role(source_role_id uuid, new_role_name text, new_role_description text DEFAULT NULL::text, target_tenant_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_role_id UUID;
  current_tenant_id UUID;
BEGIN
  -- Get current tenant if not specified
  IF target_tenant_id IS NULL THEN
    current_tenant_id := get_user_tenant_id();
  ELSE
    current_tenant_id := target_tenant_id;
  END IF;
  
  -- Create new role
  INSERT INTO public.user_roles (
    tenant_id,
    name,
    description,
    is_system_role,
    is_active,
    is_editable,
    created_by
  )
  SELECT 
    current_tenant_id,
    new_role_name,
    COALESCE(new_role_description, ur.description),
    false, -- copied roles are never system roles
    true,
    true,
    auth.uid()
  FROM public.user_roles ur
  WHERE ur.id = source_role_id
  RETURNING id INTO new_role_id;
  
  -- Copy all permissions
  INSERT INTO public.role_permissions (role_id, permission_id, granted)
  SELECT new_role_id, permission_id, granted
  FROM public.role_permissions
  WHERE role_id = source_role_id;
  
  RETURN new_role_id;
END;
$function$;

-- Fix calculate_aging_analysis function
CREATE OR REPLACE FUNCTION public.calculate_aging_analysis(tenant_id_param uuid, analysis_type text, as_of_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(current_amount numeric, days_30_amount numeric, days_60_amount numeric, days_90_amount numeric, days_over_90_amount numeric, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF analysis_type = 'receivable' THEN
    RETURN QUERY
    SELECT 
      COALESCE(SUM(CASE WHEN as_of_date - due_date <= 0 THEN outstanding_amount ELSE 0 END), 0) as current_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 1 AND 30 THEN outstanding_amount ELSE 0 END), 0) as days_30_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END), 0) as days_60_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END), 0) as days_90_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date > 90 THEN outstanding_amount ELSE 0 END), 0) as days_over_90_amount,
      COALESCE(SUM(outstanding_amount), 0) as total_amount
    FROM public.accounts_receivable
    WHERE tenant_id = tenant_id_param 
      AND status IN ('outstanding', 'partial', 'overdue')
      AND outstanding_amount > 0;
  ELSIF analysis_type = 'payable' THEN
    RETURN QUERY
    SELECT 
      COALESCE(SUM(CASE WHEN as_of_date - due_date <= 0 THEN outstanding_amount ELSE 0 END), 0) as current_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 1 AND 30 THEN outstanding_amount ELSE 0 END), 0) as days_30_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END), 0) as days_60_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END), 0) as days_90_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date > 90 THEN outstanding_amount ELSE 0 END), 0) as days_over_90_amount,
      COALESCE(SUM(outstanding_amount), 0) as total_amount
    FROM public.accounts_payable
    WHERE tenant_id = tenant_id_param 
      AND status IN ('outstanding', 'partial', 'overdue')
      AND outstanding_amount > 0;
  END IF;
END;
$function$;

-- Fix is_domain_available function
CREATE OR REPLACE FUNCTION public.is_domain_available(domain_name_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.tenant_domains 
    WHERE domain_name = domain_name_param 
    AND is_active = true
  );
END;
$function$;

-- Fix get_tenant_by_domain function
CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(domain_name_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT tenant_id INTO tenant_uuid
  FROM public.tenant_domains
  WHERE domain_name = domain_name_param
    AND is_active = true
    AND status = 'verified'
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$function$;

-- Fix setup_monthly_billing_cycle function
CREATE OR REPLACE FUNCTION public.setup_monthly_billing_cycle(tenant_id_param uuid, billing_plan_id_param uuid, start_date_param date DEFAULT CURRENT_DATE)
RETURNS TABLE(billing_amount numeric, is_prorated boolean, next_billing_date date, billing_period_start date, billing_period_end date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  plan_price NUMERIC;
  proration_result RECORD;
  billing_start DATE;
  billing_end DATE;
  is_first_billing BOOLEAN;
BEGIN
  -- Get plan price
  SELECT price INTO plan_price
  FROM billing_plans 
  WHERE id = billing_plan_id_param AND is_active = true;
  
  IF plan_price IS NULL THEN
    RAISE EXCEPTION 'Invalid billing plan';
  END IF;
  
  -- Check if this is first billing (prorated)
  is_first_billing := EXTRACT(DAY FROM start_date_param) != 1;
  
  IF is_first_billing THEN
    -- Calculate prorated billing
    SELECT * INTO proration_result 
    FROM calculate_prorated_amount(plan_price, start_date_param, 1);
    
    billing_start := start_date_param;
    billing_end := proration_result.next_billing_date - INTERVAL '1 day';
    
    RETURN QUERY SELECT 
      proration_result.prorated_amount,
      true,
      proration_result.next_billing_date,
      billing_start,
      billing_end;
  ELSE
    -- Regular monthly billing (starting on 1st)
    billing_start := start_date_param;
    billing_end := calculate_next_billing_date(start_date_param) - INTERVAL '1 day';
    
    RETURN QUERY SELECT 
      plan_price,
      false,
      calculate_next_billing_date(start_date_param),
      billing_start,
      billing_end;
  END IF;
END;
$function$;

-- Fix remaining complex business functions
CREATE OR REPLACE FUNCTION public.get_campaign_target_tenants(target_audience_param text, segment_criteria_param jsonb DEFAULT NULL::jsonb)
RETURNS TABLE(tenant_id uuid, tenant_name text, admin_email text, admin_name text, status text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        p.email as admin_email,
        p.full_name as admin_name,
        t.status::TEXT,
        t.created_at
    FROM public.tenants t
    JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.role IN ('owner', 'admin')
    JOIN public.profiles p ON tu.user_id = p.user_id
    WHERE 
        CASE 
            WHEN target_audience_param = 'all' THEN true
            WHEN target_audience_param = 'active_tenants' THEN t.status = 'active'
            WHEN target_audience_param = 'trial_tenants' THEN t.status = 'trial'
            WHEN target_audience_param = 'churned_tenants' THEN t.status = 'cancelled'
            ELSE true
        END
        AND t.is_active = true
        AND p.email IS NOT NULL
        AND p.email NOT IN (SELECT email FROM public.email_blacklist WHERE is_global = true)
    ORDER BY t.created_at DESC;
END;
$function$;