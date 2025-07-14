-- Confirm the admin email and ensure they can login
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_sent_at = NOW()
WHERE email = 'admin@vibepos.com';