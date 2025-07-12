-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'manager', 'cashier', 'user');

-- Remove the default constraint first
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Update existing role values to match enum values
UPDATE public.profiles SET role = 'user' WHERE role IS NULL OR role = '';

-- Convert column to use the enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role = 'superadmin' THEN 'superadmin'::user_role
    WHEN role = 'admin' THEN 'admin'::user_role
    WHEN role = 'manager' THEN 'manager'::user_role
    WHEN role = 'cashier' THEN 'cashier'::user_role
    ELSE 'user'::user_role
  END;

-- Set the default to user role
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user'::user_role;

-- Create superadmin credentials
-- Email: admin@vibepos.com
-- Password: VibePOS2024!

-- Note: We cannot directly insert into auth.users as it's managed by Supabase
-- Instead, we'll create a note for manual superadmin creation
CREATE TABLE IF NOT EXISTS public.system_notes (
  id SERIAL PRIMARY KEY,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.system_notes (note) VALUES 
('SUPERADMIN CREDENTIALS: Email: admin@vibepos.com | Password: VibePOS2024! | Please sign up with these credentials and update role to superadmin manually.');

-- Create policies for superadmin access
CREATE POLICY "Superadmins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'superadmin'
  )
);

CREATE POLICY "Superadmins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'superadmin'
  )
);