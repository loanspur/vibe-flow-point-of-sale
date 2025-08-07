-- Ensure default system roles exist for this tenant
DO $$
BEGIN
  -- Call the existing function to set up default user roles
  PERFORM setup_default_user_roles('3ee42812-de3a-4125-ac20-36e46e8c2182');
END $$;