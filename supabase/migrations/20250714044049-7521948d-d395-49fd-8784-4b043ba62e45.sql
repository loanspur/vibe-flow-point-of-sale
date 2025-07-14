-- Reset the password for the admin user to ensure it works
UPDATE auth.users 
SET encrypted_password = crypt('VibePOS2024!', gen_salt('bf'))
WHERE email = 'admin@vibepos.com';