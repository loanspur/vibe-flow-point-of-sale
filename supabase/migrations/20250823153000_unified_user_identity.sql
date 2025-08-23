-- Unify user identity across profiles, tenant_users, roles and emails
-- 1) Backfill tenant_users from profiles
INSERT INTO tenant_users (tenant_id, user_id, role, is_active, invited_at, created_at, invitation_status)
SELECT p.tenant_id, p.user_id, COALESCE(p.role, 'user'), true, NULL, NOW(), 'accepted'
FROM profiles p
WHERE p.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.tenant_id = p.tenant_id AND tu.user_id = p.user_id
  );

-- 2) Ensure uniqueness across tenant_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'tenant_users_unique_tenant_user'
  ) THEN
    CREATE UNIQUE INDEX tenant_users_unique_tenant_user ON tenant_users(tenant_id, user_id);
  END IF;
END$$;

-- 3) Trigger: when a profile is inserted/updated with a tenant, ensure tenant_users row exists
CREATE OR REPLACE FUNCTION public.sync_tenant_user_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO tenant_users (tenant_id, user_id, role, is_active, invited_at, created_at, invitation_status)
    VALUES (NEW.tenant_id, NEW.user_id, COALESCE(NEW.role, 'user'), true, NULL, NOW(), COALESCE(NEW.invitation_status, 'accepted'))
    ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET role = COALESCE(EXCLUDED.role, tenant_users.role),
          is_active = true;
  END IF;
  RETURN NEW;
END$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_tenant_user_from_profile_ins ON profiles;
CREATE TRIGGER trg_sync_tenant_user_from_profile_ins
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_user_from_profile();

DROP TRIGGER IF EXISTS trg_sync_tenant_user_from_profile_upd ON profiles;
CREATE TRIGGER trg_sync_tenant_user_from_profile_upd
AFTER UPDATE OF tenant_id, role ON profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_user_from_profile();

-- 4) Optional Trigger: when tenant_users inserted, align profiles.tenant_id if null
CREATE OR REPLACE FUNCTION public.sync_profile_from_tenant_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles p
     SET tenant_id = COALESCE(p.tenant_id, NEW.tenant_id),
         updated_at = NOW()
   WHERE p.user_id = NEW.user_id;
  RETURN NEW;
END$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_from_tenant_user ON tenant_users;
CREATE TRIGGER trg_sync_profile_from_tenant_user
AFTER INSERT ON tenant_users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_tenant_user();

-- 5) Update get_tenant_users_with_roles to include profiles without tenant_users
CREATE OR REPLACE FUNCTION public.get_tenant_users_with_roles(
  p_tenant_id uuid DEFAULT NULL::uuid,
  p_search text DEFAULT NULL::text,
  p_role_filter text DEFAULT NULL::text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  primary_role text,
  role_names text[],
  invited boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  status text,
  total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  effective_tenant_id uuid;
  caller_role user_role;
  is_member boolean;
BEGIN
  effective_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());

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

  RETURN QUERY
  WITH base AS (
    -- A) Members with tenant_users rows
    SELECT 
      u.id AS user_id,
      u.email,
      p.full_name,
      COALESCE(
        (
          SELECT ur2.name FROM user_role_assignments ura2
          JOIN user_roles ur2 ON ur2.id = ura2.role_id
          WHERE ura2.user_id = u.id AND ura2.is_active = true
            AND ura2.tenant_id = effective_tenant_id AND ur2.tenant_id = effective_tenant_id AND ur2.is_active = true
          ORDER BY ur2.level NULLS LAST, ur2.name LIMIT 1
        ),
        COALESCE(tu.role, p.role::text, 'user')
      ) AS primary_role,
      COALESCE(
        (
          SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT ur3.name), NULL)
          FROM user_role_assignments ura3
          JOIN user_roles ur3 ON ur3.id = ura3.role_id
          WHERE ura3.user_id = u.id AND ura3.is_active = true
            AND ura3.tenant_id = effective_tenant_id AND ur3.tenant_id = effective_tenant_id AND ur3.is_active = true
        ),
        ARRAY[COALESCE(tu.role, p.role::text, 'user')]
      ) AS role_names,
      (tu.invitation_status = 'pending') AS invited,
      u.last_sign_in_at,
      u.created_at,
      CASE WHEN tu.is_active THEN 'active' ELSE 'inactive' END AS status
    FROM tenant_users tu
    JOIN auth.users u ON u.id = tu.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE tu.tenant_id = effective_tenant_id
  ),
  supplemental AS (
    -- B) Profiles that belong to this tenant but missing in tenant_users
    SELECT 
      u.id AS user_id,
      u.email,
      p.full_name,
      COALESCE(p.role::text, 'user') AS primary_role,
      ARRAY[COALESCE(p.role::text, 'user')] AS role_names,
      false AS invited,
      u.last_sign_in_at,
      u.created_at,
      'active' AS status
    FROM profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.tenant_id = effective_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM tenant_users tu WHERE tu.tenant_id = effective_tenant_id AND tu.user_id = p.user_id
      )
  )
  SELECT *, COUNT(*) OVER() AS total_count
  FROM (
    SELECT * FROM base
    UNION ALL
    SELECT * FROM supplemental
  ) all_rows
  WHERE (
    p_search IS NULL OR
    email ILIKE ('%' || p_search || '%') OR COALESCE(full_name,'') ILIKE ('%' || p_search || '%')
  )
  AND (
    p_role_filter IS NULL OR
    (
      EXISTS (
        SELECT 1 FROM unnest(role_names) r(name)
        WHERE r.name ILIKE ('%' || p_role_filter || '%')
      )
    )
  )
  ORDER BY COALESCE(full_name, email)
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
END;
$$;


