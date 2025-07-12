-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'manager', 'cashier', 'user');

-- Update profiles table to use the enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING role::user_role;

-- Set default role to 'user'
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'user';

-- Create a function to create superadmin user
CREATE OR REPLACE FUNCTION public.create_superadmin_user()
RETURNS void AS $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Check if superadmin already exists
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = 'admin@vibepos.com'
    ) THEN
        -- Insert superadmin user into auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@vibepos.com',
            crypt('VibePOS2024!', gen_salt('bf')),
            NOW(),
            NOW(),
            '',
            NOW(),
            '',
            NULL,
            '',
            '',
            NULL,
            NULL,
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Super Administrator"}',
            false,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            '',
            0,
            NULL,
            '',
            NULL,
            false,
            NULL
        ) RETURNING id INTO admin_user_id;

        -- Insert superadmin profile
        INSERT INTO public.profiles (
            user_id,
            full_name,
            role
        ) VALUES (
            admin_user_id,
            'Super Administrator',
            'superadmin'
        );

        RAISE NOTICE 'Superadmin user created successfully with email: admin@vibepos.com and password: VibePOS2024!';
    ELSE
        RAISE NOTICE 'Superadmin user already exists';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create superadmin
SELECT public.create_superadmin_user();

-- Create a policy for superadmin to view all profiles
CREATE POLICY "Superadmins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role = 'superadmin'
    )
);

-- Create a policy for superadmins to update all profiles
CREATE POLICY "Superadmins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role = 'superadmin'
    )
);