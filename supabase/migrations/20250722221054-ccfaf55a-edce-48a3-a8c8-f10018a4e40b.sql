-- Add missing RLS policies for user_invitations table

-- Allow all tenant users to view invitations in their tenant
CREATE POLICY "Tenant users can view invitations" 
ON public.user_invitations 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Allow tenant staff to manage invitations (more specific than the existing policy)
DROP POLICY IF EXISTS "Tenant managers can manage invitations" ON public.user_invitations;

CREATE POLICY "Tenant managers can manage invitations" 
ON public.user_invitations 
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

-- Ensure invited users can accept their own invitations
CREATE POLICY "Users can accept their own invitations" 
ON public.user_invitations 
FOR UPDATE 
USING (status = 'pending' AND expires_at > now());