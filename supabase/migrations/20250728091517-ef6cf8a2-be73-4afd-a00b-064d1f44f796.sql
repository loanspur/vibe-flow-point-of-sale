-- Fix the user's tenant_id by manually linking them to an existing tenant or creating one
-- First, let's check if there's an existing tenant for this user
DO $$
DECLARE
    existing_tenant_id UUID;
    user_uuid UUID := 'd74e7085-8cfb-4c2c-844e-aeea8e3664a9';
BEGIN
    -- Check if there's a tenant created by this user
    SELECT id INTO existing_tenant_id
    FROM tenants 
    WHERE created_by = user_uuid
    LIMIT 1;
    
    IF existing_tenant_id IS NULL THEN
        -- Check if there's any tenant that matches the user's business name
        SELECT id INTO existing_tenant_id
        FROM tenants 
        WHERE name ILIKE '%Walela%' OR name ILIKE '%Wine%'
        LIMIT 1;
    END IF;
    
    IF existing_tenant_id IS NOT NULL THEN
        -- Update user profile with the found tenant
        UPDATE profiles 
        SET tenant_id = existing_tenant_id,
            role = 'admin',
            updated_at = now()
        WHERE user_id = user_uuid;
        
        -- Ensure user is in tenant_users table
        INSERT INTO tenant_users (tenant_id, user_id, role, is_active, created_at)
        VALUES (existing_tenant_id, user_uuid, 'admin', true, now())
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET
            role = 'admin',
            is_active = true;
            
        RAISE NOTICE 'Updated user % with tenant %', user_uuid, existing_tenant_id;
    ELSE
        -- Create a new tenant for this user
        INSERT INTO tenants (
            name, 
            subdomain, 
            contact_email, 
            created_by, 
            status, 
            is_active
        ) VALUES (
            'Walela Wines & Spirits',
            'walela-wines-spirits',
            'antotwalela@gmail.com',
            user_uuid,
            'active',
            true
        ) RETURNING id INTO existing_tenant_id;
        
        -- Update user profile
        UPDATE profiles 
        SET tenant_id = existing_tenant_id,
            role = 'admin',
            updated_at = now()
        WHERE user_id = user_uuid;
        
        -- Add user to tenant_users table
        INSERT INTO tenant_users (tenant_id, user_id, role, is_active, created_at)
        VALUES (existing_tenant_id, user_uuid, 'admin', true, now());
        
        RAISE NOTICE 'Created new tenant % for user %', existing_tenant_id, user_uuid;
    END IF;
END $$;