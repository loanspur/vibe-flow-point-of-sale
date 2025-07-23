-- Fix role inconsistency for superadmin user
-- Update tenant_users table to match the superadmin role from profiles table
UPDATE tenant_users 
SET role = 'superadmin' 
WHERE user_id = 'ef237ab3-4e66-4dd8-91bb-ddceeb69be62' 
AND tenant_id = '11111111-1111-1111-1111-111111111111';