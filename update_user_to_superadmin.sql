-- Update User to Superadmin
-- Choose one of the following options:

-- Option 1: Update the first user (justmurenga@gmail.com) to superadmin
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE user_id = 'ef237ab3-4e66-4dd8-91bb-ddceeb69be62';

-- Option 2: Update a specific user by email (uncomment and modify as needed)
-- UPDATE public.profiles 
-- SET role = 'superadmin' 
-- WHERE user_id = (
--     SELECT id FROM auth.users 
--     WHERE email = 'your-email@example.com'
-- );

-- Option 3: Update multiple users to superadmin (uncomment if needed)
-- UPDATE public.profiles 
-- SET role = 'superadmin' 
-- WHERE user_id IN (
--     'ef237ab3-4e66-4dd8-91bb-ddceeb69be62',  -- justmurenga@gmail.com
--     '20437d89-c634-4865-9ed7-e9e267243235'   -- damzaltd@gmail.com
-- );

-- Verify the update
SELECT 
    p.user_id, 
    p.role, 
    u.email,
    p.updated_at
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'superadmin';
