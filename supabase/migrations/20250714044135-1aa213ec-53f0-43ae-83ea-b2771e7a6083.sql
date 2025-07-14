-- Remove the problematic admin user and create a note for manual signup
DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@vibepos.com');
DELETE FROM auth.users WHERE email = 'admin@vibepos.com';

-- Update the system notes
UPDATE public.system_notes 
SET note = 'SUPERADMIN SETUP: 1) Sign up with ANY email/password you prefer 2) Tell me your email and I will upgrade you to superadmin role'
WHERE note LIKE '%SUPERADMIN CREDENTIALS%';