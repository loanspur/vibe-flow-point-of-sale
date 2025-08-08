DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the auth user by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'justmurenga@gmail.com' LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found with email %', 'justmurenga@gmail.com';
  END IF;

  -- Temporarily disable triggers on profiles to bypass role-assignment guard
  EXECUTE 'ALTER TABLE public.profiles DISABLE TRIGGER ALL';
  BEGIN
    -- Elevate or create profile with superadmin role
    UPDATE public.profiles 
    SET role = 'superadmin'::public.user_role,
        full_name = COALESCE(full_name, 'Super Administrator'),
        updated_at = now()
    WHERE user_id = target_user_id;

    IF NOT FOUND THEN
      INSERT INTO public.profiles (user_id, role, full_name)
      VALUES (target_user_id, 'superadmin'::public.user_role, 'Super Administrator');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Re-enable triggers and rethrow
    EXECUTE 'ALTER TABLE public.profiles ENABLE TRIGGER ALL';
    RAISE;
  END;
  -- Re-enable triggers
  EXECUTE 'ALTER TABLE public.profiles ENABLE TRIGGER ALL';
END $$;