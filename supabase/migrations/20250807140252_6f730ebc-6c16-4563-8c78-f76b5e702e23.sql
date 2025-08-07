-- Update user role to admin instead of owner
UPDATE tenant_users 
SET role = 'admin'
WHERE tenant_id = '3ee42812-de3a-4125-ac20-36e46e8c2182' 
AND user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE tenant_id = '3ee42812-de3a-4125-ac20-36e46e8c2182' 
  LIMIT 1
);