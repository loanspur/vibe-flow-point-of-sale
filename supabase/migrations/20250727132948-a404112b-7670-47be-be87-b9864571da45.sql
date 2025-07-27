-- Confirm email for damarisnyabonyi16@gmail.com
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'damarisnyabonyi16@gmail.com';