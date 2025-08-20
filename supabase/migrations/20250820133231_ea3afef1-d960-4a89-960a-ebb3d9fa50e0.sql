-- Clean up communication logs for test users to allow deletion
DELETE FROM communication_logs 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('taxipurapp@gmail.com', 'magharibichicksltd@gmail.com')
);