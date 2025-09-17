-- Create Superadmin User Script
-- Run this in your Supabase SQL Editor

-- First, let's see what users exist
SELECT id, email, created_at FROM auth.users;

-- Update the first user to be superadmin (replace with actual user ID)
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE user_id IN (
    SELECT id FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1
);

-- Or update a specific user by email (replace with your email)
-- UPDATE public.profiles 
-- SET role = 'superadmin' 
-- WHERE user_id = (
--     SELECT id FROM auth.users 
--     WHERE email = 'your-email@example.com'
-- );

-- Verify the update
SELECT p.user_id, p.role, u.email 
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'superadmin';
