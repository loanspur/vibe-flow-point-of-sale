-- Security Fix: Fix remaining database functions with search_path

-- Fix set_current_version function
CREATE OR REPLACE FUNCTION public.set_current_version(version_number_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is superadmin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Only superadmins can set current version';
  END IF;
  
  -- Clear current version flag from all versions
  UPDATE application_versions 
  SET is_current = false, updated_at = now();
  
  -- Set new current version
  UPDATE application_versions 
  SET is_current = true, updated_at = now()
  WHERE version_number = version_number_param;
  
  RETURN FOUND;
END;
$function$;

-- Fix track_tenant_deployment function
CREATE OR REPLACE FUNCTION public.track_tenant_deployment(tenant_id_param uuid, version_number_param text, deployment_method_param text DEFAULT 'automatic'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  version_record RECORD;
  tracking_id UUID;
BEGIN
  -- Get version info
  SELECT * INTO version_record
  FROM application_versions
  WHERE version_number = version_number_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found', version_number_param;
  END IF;
  
  -- Deactivate previous deployments for this tenant
  UPDATE tenant_version_tracking
  SET deployment_status = 'superseded', updated_at = now()
  WHERE tenant_id = tenant_id_param AND deployment_status = 'active';
  
  -- Create new tracking record
  INSERT INTO tenant_version_tracking (
    tenant_id, version_id, deployment_method, deployment_status
  ) VALUES (
    tenant_id_param, version_record.id, deployment_method_param, 'active'
  ) RETURNING id INTO tracking_id;
  
  RETURN tracking_id;
END;
$function$;

-- Fix process_cash_transfer_request function
CREATE OR REPLACE FUNCTION public.process_cash_transfer_request(transfer_request_id_param uuid, action_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transfer_record RECORD;
  from_drawer_balance NUMERIC;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Get transfer request details
  SELECT * INTO transfer_record
  FROM cash_transfer_requests
  WHERE id = transfer_request_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer request not found';
  END IF;
  
  -- Check if already processed
  IF transfer_record.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer request already processed';
  END IF;
  
  IF action_param = 'approve' THEN
    -- Get current balance of from_drawer
    SELECT current_balance INTO from_drawer_balance
    FROM cash_drawers
    WHERE id = transfer_record.from_drawer_id;
    
    -- Check for overdraw protection
    IF from_drawer_balance < transfer_record.amount THEN
      RAISE EXCEPTION 'Insufficient funds in source drawer. Available: %, Requested: %', 
        from_drawer_balance, transfer_record.amount;
    END IF;
    
    -- Deduct from source drawer
    UPDATE cash_drawers
    SET 
      current_balance = current_balance - transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.from_drawer_id;
    
    -- Add to destination drawer
    UPDATE cash_drawers
    SET 
      current_balance = current_balance + transfer_record.amount,
      updated_at = now()
    WHERE id = transfer_record.to_drawer_id;
    
    -- Create transaction records
    -- Debit transaction for source drawer
    INSERT INTO cash_transactions (
      tenant_id,
      cash_drawer_id,
      transaction_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      description,
      performed_by,
      transaction_date
    )
    SELECT 
      transfer_record.tenant_id,
      transfer_record.from_drawer_id,
      'drawer_transfer_out',
      -transfer_record.amount,
      cd.current_balance,
      'transfer_request',
      transfer_request_id_param,
      'Transfer to drawer: ' || COALESCE(cd_to.drawer_name, 'Unknown'),
      current_user_id,
      now()
    FROM cash_drawers cd
    LEFT JOIN cash_drawers cd_to ON cd_to.id = transfer_record.to_drawer_id
    WHERE cd.id = transfer_record.from_drawer_id;
    
    -- Credit transaction for destination drawer
    INSERT INTO cash_transactions (
      tenant_id,
      cash_drawer_id,
      transaction_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      description,
      performed_by,
      transaction_date
    )
    SELECT 
      transfer_record.tenant_id,
      transfer_record.to_drawer_id,
      'drawer_transfer_in',
      transfer_record.amount,
      cd.current_balance,
      'transfer_request',
      transfer_request_id_param,
      'Transfer from drawer: ' || COALESCE(cd_from.drawer_name, 'Unknown'),
      current_user_id,
      now()
    FROM cash_drawers cd
    LEFT JOIN cash_drawers cd_from ON cd_from.id = transfer_record.from_drawer_id
    WHERE cd.id = transfer_record.to_drawer_id;
    
    -- Update transfer request status
    UPDATE cash_transfer_requests
    SET 
      status = 'approved',
      responded_at = now(),
      responded_by = current_user_id
    WHERE id = transfer_request_id_param;
    
  ELSIF action_param = 'reject' THEN
    -- Just update status to rejected
    UPDATE cash_transfer_requests
    SET 
      status = 'rejected',
      responded_at = now(),
      responded_by = current_user_id
    WHERE id = transfer_request_id_param;
  ELSE
    RAISE EXCEPTION 'Invalid action. Must be approve or reject';
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(identifier_param text, action_type_param text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15, block_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_window_start timestamp with time zone;
  rate_limit_record RECORD;
  is_blocked boolean DEFAULT false;
BEGIN
  -- Calculate current window start (rounded to window_minutes)
  current_window_start := date_trunc('minute', now()) - 
    (EXTRACT(minute FROM now())::integer % window_minutes) * INTERVAL '1 minute';
  
  -- Check for existing rate limit record
  SELECT * INTO rate_limit_record
  FROM rate_limits
  WHERE identifier = identifier_param
    AND action_type = action_type_param
    AND window_start >= current_window_start;
  
  -- Check if currently blocked
  IF rate_limit_record.blocked_until IS NOT NULL AND 
     rate_limit_record.blocked_until > now() THEN
    RETURN FALSE;
  END IF;
  
  -- Update or create rate limit record
  IF FOUND THEN
    UPDATE rate_limits
    SET 
      attempt_count = attempt_count + 1,
      updated_at = now(),
      blocked_until = CASE 
        WHEN attempt_count + 1 >= max_attempts 
        THEN now() + (block_minutes || ' minutes')::interval
        ELSE NULL
      END
    WHERE id = rate_limit_record.id;
    
    -- Check if this update caused a block
    IF rate_limit_record.attempt_count + 1 >= max_attempts THEN
      RETURN FALSE;
    END IF;
  ELSE
    -- Create new rate limit record
    INSERT INTO rate_limits (
      identifier, action_type, attempt_count, window_start
    ) VALUES (
      identifier_param, action_type_param, 1, current_window_start
    );
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid, details jsonb DEFAULT '{}'::jsonb, ip_address_param inet DEFAULT NULL::inet, user_agent_param text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  log_id uuid;
  tenant_id_param uuid;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO tenant_id_param
  FROM profiles
  WHERE user_id = user_id_param;
  
  -- Log the security event
  INSERT INTO user_activity_logs (
    tenant_id, user_id, action_type, resource_type, details, ip_address, user_agent
  ) VALUES (
    tenant_id_param, user_id_param, event_type, 'security', details, ip_address_param, user_agent_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;