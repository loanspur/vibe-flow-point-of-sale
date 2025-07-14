-- Upgrade justmurenga@gmail.com to superadmin role
UPDATE public.profiles 
SET 
  role = 'superadmin'::user_role,
  full_name = 'Super Administrator'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'justmurenga@gmail.com'
);