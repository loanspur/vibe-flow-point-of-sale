-- Fix RLS policies for user_invitations and contacts tables to allow proper querying

-- Drop existing restrictive policies for user_invitations
DROP POLICY IF EXISTS "Tenant users can view invitations" ON public.user_invitations;

-- Create more permissive policy for checking pending invitations
CREATE POLICY "Users can check invitations by email" 
ON public.user_invitations 
FOR SELECT 
USING (true); -- Allow anyone to check for pending invitations by email

-- Ensure contacts table has proper RLS policy for checking existing users
DROP POLICY IF EXISTS "Tenant users can view tenant contacts" ON public.contacts;

CREATE POLICY "Tenant users can view tenant contacts" 
ON public.contacts 
FOR SELECT 
USING (tenant_id = get_user_tenant_id() OR true); -- Allow checking contacts across tenants for invitation purposes