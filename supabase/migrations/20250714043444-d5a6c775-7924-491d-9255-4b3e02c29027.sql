-- Remove the directly inserted user and create through proper channels
DELETE FROM auth.users WHERE email = 'admin@vibepos.com';

-- Create a function to handle superadmin creation after signup
CREATE OR REPLACE FUNCTION public.create_superadmin_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update any existing profile with admin@vibepos.com email to superadmin role
  UPDATE public.profiles 
  SET role = 'superadmin'::user_role, full_name = 'Super Administrator'
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@vibepos.com'
  );
END;
$$;