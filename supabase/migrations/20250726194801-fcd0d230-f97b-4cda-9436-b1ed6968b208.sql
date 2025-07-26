-- Create tenant and link user profile for the logged in user
DO $$
DECLARE
    user_uuid UUID := '7e1f832e-b256-4697-9a63-b974150246d9';
    business_name_val TEXT := 'loanspur sbs';
    new_tenant_id UUID;
    subdomain_val TEXT;
BEGIN
    -- Generate subdomain from business name
    subdomain_val := lower(regexp_replace(business_name_val, '[^a-zA-Z0-9]', '', 'g'));
    IF length(subdomain_val) < 3 THEN
        subdomain_val := subdomain_val || 'pos';
    END IF;
    
    -- Create tenant
    INSERT INTO public.tenants (
        name,
        subdomain,
        is_active,
        plan_type,
        created_at
    ) VALUES (
        business_name_val,
        subdomain_val,
        true,
        'basic',
        NOW()
    ) RETURNING id INTO new_tenant_id;
    
    -- Update profile with tenant and admin role
    UPDATE public.profiles 
    SET 
        tenant_id = new_tenant_id,
        role = 'admin'::user_role,
        full_name = 'loanspur cbs',
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Create tenant_users entry
    INSERT INTO public.tenant_users (
        tenant_id,
        user_id,
        role,
        is_active,
        created_at
    ) VALUES (
        new_tenant_id,
        user_uuid,
        'owner',
        true,
        NOW()
    ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = 'owner',
        is_active = true,
        updated_at = NOW();
        
END $$;