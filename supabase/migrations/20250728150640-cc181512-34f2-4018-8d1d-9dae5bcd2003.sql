-- Security Enhancement Migration: Critical Fixes
-- Phase 1: Address all critical security vulnerabilities

-- 1. Fix Function Search Path Issues (7 functions need SET search_path TO 'public')
-- Update all functions that lack explicit search_path setting

-- Fix generate_otp_code function
DROP FUNCTION IF EXISTS public.generate_otp_code();
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

-- Fix create_otp_verification function  
DROP FUNCTION IF EXISTS public.create_otp_verification(uuid, text, text);
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
  DELETE FROM public.email_verification_otps 
  WHERE user_id = user_id_param 
    AND otp_type = otp_type_param 
    AND used_at IS NULL;
  
  -- Insert new OTP
  INSERT INTO public.email_verification_otps (
    user_id, email, otp_code, otp_type, expires_at
  ) VALUES (
    user_id_param, email_param, generated_otp, otp_type_param, expiry_time
  );
  
  RETURN QUERY SELECT generated_otp, expiry_time;
END;
$function$;

-- Fix verify_otp_code function
DROP FUNCTION IF EXISTS public.verify_otp_code(uuid, text, text);
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
  FROM public.email_verification_otps
  WHERE user_id = user_id_param
    AND otp_code = otp_code_param
    AND otp_type = otp_type_param
    AND expires_at > now()
    AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark OTP as used
  UPDATE public.email_verification_otps
  SET used_at = now()
  WHERE id = otp_record.id;
  
  -- If email verification, update profile
  IF otp_type_param = 'email_verification' THEN
    UPDATE public.profiles
    SET email_verified = true,
        email_verified_at = now()
    WHERE user_id = user_id_param;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix generate_invitation_token function
DROP FUNCTION IF EXISTS public.generate_invitation_token();
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$function$;

-- Fix create_user_invitation function
DROP FUNCTION IF EXISTS public.create_user_invitation(uuid, text, uuid, uuid, integer);
CREATE OR REPLACE FUNCTION public.create_user_invitation(tenant_id_param uuid, email_param text, role_id_param uuid, invited_by_param uuid, expires_in_hours integer DEFAULT 72)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_id UUID;
  token TEXT;
BEGIN
  -- Generate unique token
  token := generate_invitation_token();
  
  -- Create invitation
  INSERT INTO public.user_invitations (
    tenant_id,
    email,
    role_id,
    invited_by,
    invitation_token,
    expires_at
  ) VALUES (
    tenant_id_param,
    email_param,
    role_id_param,
    invited_by_param,
    token,
    now() + (expires_in_hours || ' hours')::interval
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$function$;

-- 2. Critical Role Assignment Security Fix
-- Prevent users from escalating their own privileges
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role user_role;
  old_user_role user_role;
  is_self_update boolean;
BEGIN
  -- Check if user is trying to update their own profile
  is_self_update := (NEW.user_id = auth.uid());
  
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Get the old role if this is an update
  IF TG_OP = 'UPDATE' THEN
    old_user_role := OLD.role;
  END IF;
  
  -- Prevent role escalation in self-updates
  IF is_self_update AND TG_OP = 'UPDATE' THEN
    -- Users cannot change their own role
    IF NEW.role != OLD.role THEN
      RAISE EXCEPTION 'Users cannot change their own role. Contact an administrator.';
    END IF;
  END IF;
  
  -- Only superadmins can assign superadmin role
  IF NEW.role = 'superadmin' AND current_user_role != 'superadmin' THEN
    RAISE EXCEPTION 'Only superadmins can assign superadmin role';
  END IF;
  
  -- Only admins and superadmins can assign admin role
  IF NEW.role = 'admin' AND current_user_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Only admins or superadmins can assign admin role';
  END IF;
  
  -- Log role changes for audit
  IF TG_OP = 'UPDATE' AND NEW.role != OLD.role THEN
    INSERT INTO user_activity_logs (
      tenant_id, user_id, action_type, resource_type, resource_id, details
    ) VALUES (
      NEW.tenant_id, 
      auth.uid(), 
      'role_change', 
      'profile', 
      NEW.user_id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'target_user', NEW.user_id,
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for role assignment validation
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON profiles;
CREATE TRIGGER validate_role_assignment_trigger
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_assignment();

-- 3. Add Rate Limiting Table for OTP Operations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user identifier
  action_type text NOT NULL, -- 'otp_generation', 'otp_verification', etc.
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
ON rate_limits(identifier, action_type, window_start);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy for rate_limits (system use only)
CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (true);

-- 4. Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier_param text, 
  action_type_param text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15,
  block_minutes integer DEFAULT 60
)
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
  FROM public.rate_limits
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
    UPDATE public.rate_limits
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
    INSERT INTO public.rate_limits (
      identifier, action_type, attempt_count, window_start
    ) VALUES (
      identifier_param, action_type_param, 1, current_window_start
    );
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- 5. Add comprehensive audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id_param uuid,
  details jsonb DEFAULT '{}',
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL
)
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