
-- Create superadmin user directly in auth.users table
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Check if superadmin already exists
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = 'admin@vibepos.com'
    ) THEN
        -- Generate a new UUID for the admin user
        admin_user_id := gen_random_uuid();
        
        -- Insert superadmin user into auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_sent_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            admin_user_id,
            'authenticated',
            'authenticated',
            'admin@vibepos.com',
            crypt('VibePOS2024!', gen_salt('bf')),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Super Administrator"}',
            false,
            NOW(),
            NOW()
        );

        -- Insert corresponding profile with superadmin role
        INSERT INTO public.profiles (
            user_id,
            full_name,
            role
        ) VALUES (
            admin_user_id,
            'Super Administrator',
            'superadmin'::user_role
        );

        RAISE NOTICE 'Superadmin user created successfully with email: admin@vibepos.com and password: VibePOS2024!';
    ELSE
        RAISE NOTICE 'Superadmin user already exists';
    END IF;
END;
$$;
