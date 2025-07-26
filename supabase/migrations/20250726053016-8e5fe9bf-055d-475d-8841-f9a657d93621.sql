-- Fix RLS policies to completely allow invitation and contact checking
-- Drop all existing policies and create simpler ones

-- Fix user_invitations table
DROP POLICY IF EXISTS "Users can check invitations by email" ON public.user_invitations;
DROP POLICY IF EXISTS "Tenant managers can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can accept their own invitations" ON public.user_invitations;

-- Create simple policies for user_invitations
CREATE POLICY "Allow all invitation reads" ON public.user_invitations FOR SELECT USING (true);
CREATE POLICY "Tenant managers can manage invitations" ON public.user_invitations FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));
CREATE POLICY "Users can accept invitations" ON public.user_invitations FOR UPDATE 
USING (status = 'pending' AND expires_at > now());

-- Fix contacts table 
DROP POLICY IF EXISTS "Tenant users can view tenant contacts" ON public.contacts;
DROP POLICY IF EXISTS "Tenant managers can manage tenant contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view and update their own contact profile" ON public.contacts;

-- Create simpler policies for contacts
CREATE POLICY "Allow all contact reads" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Tenant managers can manage contacts" ON public.contacts FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));
CREATE POLICY "Users can update their own contact" ON public.contacts FOR UPDATE 
USING (user_id = auth.uid());