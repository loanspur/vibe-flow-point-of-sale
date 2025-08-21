-- Fix the remaining ambiguous user_id column issue in get_tenant_users_with_roles function
CREATE OR REPLACE FUNCTION public.get_tenant_users_with_roles(p_tenant_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_role_filter text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, email text, full_name text, primary_role text, role_names text[], invited boolean, last_sign_in_at timestamp with time zone, created_at timestamp with time zone, status text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  effective_tenant_id uuid;
  caller_role user_role;
  is_member boolean;
BEGIN
  -- Resolve tenant
  effective_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());

  -- Authorization
  SELECT get_current_user_role() INTO caller_role;
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE tenant_id = effective_tenant_id 
      AND user_id = auth.uid()
      AND is_active = true
  ) INTO is_member;
  IF NOT (is_member OR caller_role IN ('superadmin','admin','manager')) THEN
    RAISE EXCEPTION 'Insufficient privileges to view users for this tenant';
  END IF;

  -- Main query with fully qualified column references
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email,
    p.full_name,
    (
      SELECT ur2.name
      FROM user_role_assignments ura2
      JOIN user_roles ur2 ON ur2.id = ura2.role_id
      WHERE ura2.user_id = u.id
        AND ura2.is_active = true
        AND ura2.tenant_id = effective_tenant_id
        AND ur2.tenant_id = effective_tenant_id
        AND ur2.is_active = true
      ORDER BY ur2.level NULLS LAST, ur2.name
      LIMIT 1
    ) AS primary_role,
    (
      SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT ur3.name), NULL)
      FROM user_role_assignments ura3
      JOIN user_roles ur3 ON ur3.id = ura3.role_id
      WHERE ura3.user_id = u.id
        AND ura3.is_active = true
        AND ura3.tenant_id = effective_tenant_id
        AND ur3.tenant_id = effective_tenant_id
        AND ur3.is_active = true
    ) AS role_names,
    (tu.invitation_status = 'pending') AS invited,
    u.last_sign_in_at,
    u.created_at,
    CASE WHEN tu.is_active THEN 'active' ELSE 'inactive' END AS status,
    COUNT(*) OVER() AS total_count
  FROM tenant_users tu
  JOIN auth.users u ON u.id = tu.user_id
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE tu.tenant_id = effective_tenant_id
    AND tu.is_active = true
    AND (
      p_search IS NULL OR
      u.email ILIKE ('%' || p_search || '%') OR
      COALESCE(p.full_name,'') ILIKE ('%' || p_search || '%')
    )
    AND (
      p_role_filter IS NULL OR
      EXISTS (
        SELECT 1 FROM user_role_assignments ura4
        JOIN user_roles ur4 ON ur4.id = ura4.role_id
        WHERE ura4.user_id = u.id
          AND ura4.is_active = true
          AND ura4.tenant_id = effective_tenant_id
          AND ur4.tenant_id = effective_tenant_id
          AND ur4.is_active = true
          AND ur4.name ILIKE ('%' || p_role_filter || '%')
      )
    )
  ORDER BY COALESCE(p.full_name, u.email)
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
END;
$function$;