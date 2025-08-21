-- Create missing log_user_activity function for activity logging
CREATE OR REPLACE FUNCTION public.log_user_activity(
  tenant_id_param uuid,
  user_id_param uuid,
  action_type_param text,
  resource_type_param text DEFAULT NULL,
  resource_id_param text DEFAULT NULL,
  details_param jsonb DEFAULT NULL,
  ip_address_param text DEFAULT NULL,
  user_agent_param text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.user_activity_logs (
    tenant_id,
    user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    tenant_id_param,
    user_id_param,
    action_type_param,
    resource_type_param,
    resource_id_param,
    details_param,
    ip_address_param,
    user_agent_param,
    now()
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;