-- Fix RLS policies for invitation acceptance flow

-- Allow users to insert into tenant_users during invitation acceptance
DROP POLICY IF EXISTS "Allow invitation acceptance for tenant_users" ON public.tenant_users;
CREATE POLICY "Allow invitation acceptance for tenant_users" 
ON public.tenant_users 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow if the user is accepting an invitation for this tenant
  EXISTS (
    SELECT 1 FROM public.user_invitations ui
    WHERE ui.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND ui.tenant_id = tenant_users.tenant_id
    AND ui.status = 'pending'
    AND ui.expires_at > now()
  )
);

-- Allow users to insert into user_role_assignments during invitation acceptance
DROP POLICY IF EXISTS "Allow invitation acceptance for user_role_assignments" ON public.user_role_assignments;
CREATE POLICY "Allow invitation acceptance for user_role_assignments" 
ON public.user_role_assignments 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow if the user is accepting an invitation with this role
  EXISTS (
    SELECT 1 FROM public.user_invitations ui
    WHERE ui.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND ui.role_id = user_role_assignments.role_id
    AND ui.status = 'pending'
    AND ui.expires_at > now()
  )
);

-- Allow users to update user_invitations when accepting invitations
DROP POLICY IF EXISTS "Allow invitation acceptance updates" ON public.user_invitations;
CREATE POLICY "Allow invitation acceptance updates" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
USING (
  -- Allow if the invitation is for this user's email
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > now()
)
WITH CHECK (
  -- Allow updating to 'accepted' status
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status IN ('accepted', 'pending')
);