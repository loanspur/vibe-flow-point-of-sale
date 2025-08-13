-- Create a helper to reactivate or create a tenant membership for a user by email
CREATE OR REPLACE FUNCTION public.reactivate_tenant_membership(
  tenant_id_param uuid,
  target_email_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  caller_role user_role;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Determine caller role
  SELECT role INTO caller_role FROM profiles WHERE user_id = auth.uid();

  -- Allow superadmin/admin OR self-repair (caller matches target email)
  IF caller_role NOT IN ('superadmin','admin') THEN
    PERFORM 1 FROM auth.users WHERE id = auth.uid() AND lower(email) = lower(target_email_param);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient privileges to reactivate membership';
    END IF;
  END IF;

  -- Resolve target user by email
  SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(target_email_param) LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for email %', target_email_param;
  END IF;

  -- Ensure tenant_users membership exists and is active
  INSERT INTO tenant_users (tenant_id, user_id, role, is_active, invitation_status, invited_at, created_at)
  VALUES (tenant_id_param, target_user_id, 'admin', true, 'accepted', now(), now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    is_active = true,
    invitation_status = 'accepted',
    invited_at = COALESCE(tenant_users.invited_at, now()),
    role = COALESCE(tenant_users.role, 'admin');

  -- Sync profile
  UPDATE profiles
  SET 
    tenant_id = COALESCE(tenant_id, tenant_id_param),
    role = CASE 
      WHEN caller_role = 'superadmin' THEN profiles.role
      ELSE COALESCE(profiles.role, 'admin')
    END,
    invitation_status = 'accepted',
    invitation_accepted_at = COALESCE(invitation_accepted_at, now()),
    updated_at = now()
  WHERE user_id = target_user_id;

  RETURN true;
END;
$$;