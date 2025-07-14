-- Update RLS policies for tenants table to allow superadmins full access
DROP POLICY IF EXISTS "Superadmins can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Superadmins can create tenants" ON public.tenants;

-- Allow superadmins to view and manage all tenants
CREATE POLICY "Superadmins can manage all tenants" 
ON public.tenants 
FOR ALL 
USING (get_current_user_role() = 'superadmin'::user_role);

-- Allow superadmins to create tenants
CREATE POLICY "Superadmins can create tenants" 
ON public.tenants 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'superadmin'::user_role);

-- Update the current user to superadmin role for testing
SELECT create_superadmin_profile();