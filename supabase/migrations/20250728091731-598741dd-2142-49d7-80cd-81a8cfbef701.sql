-- Fix subscription setup for Walela tenant
-- First, let's check the current subscription status and setup proper billing
DO $$
DECLARE
    tenant_uuid UUID;
    enterprise_plan_id UUID;
    user_uuid UUID := 'd74e7085-8cfb-4c2c-844e-aeea8e3664a9';
BEGIN
    -- Get the tenant ID for Walela
    SELECT id INTO tenant_uuid
    FROM tenants 
    WHERE name ILIKE '%Walela%'
    LIMIT 1;
    
    IF tenant_uuid IS NULL THEN
        RAISE EXCEPTION 'Walela tenant not found';
    END IF;
    
    -- Get Enterprise plan ID
    SELECT id INTO enterprise_plan_id
    FROM billing_plans 
    WHERE name ILIKE '%Enterprise%' AND is_active = true
    LIMIT 1;
    
    IF enterprise_plan_id IS NULL THEN
        -- Create a default plan if none exists
        INSERT INTO billing_plans (
            name, 
            description, 
            price, 
            features, 
            is_active,
            status
        ) VALUES (
            'Enterprise',
            'Full access to all features',
            0.00,
            '["unlimited_users", "advanced_reporting", "api_access", "priority_support"]'::jsonb,
            true,
            'active'
        ) RETURNING id INTO enterprise_plan_id;
    END IF;
    
    -- Update tenant with proper billing plan
    UPDATE tenants 
    SET billing_plan_id = enterprise_plan_id,
        status = 'active',
        plan_type = 'enterprise'
    WHERE id = tenant_uuid;
    
    -- Create or update subscription record for the user
    INSERT INTO subscribers (
        user_id,
        email,
        subscribed,
        subscription_tier,
        subscription_end,
        updated_at,
        created_at
    ) VALUES (
        user_uuid,
        'antotwalela@gmail.com',
        true,
        'Enterprise',
        NOW() + INTERVAL '1 year',
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        subscribed = true,
        subscription_tier = 'Enterprise',
        subscription_end = NOW() + INTERVAL '1 year',
        updated_at = NOW();
    
    -- Enable all features for this tenant
    INSERT INTO tenant_feature_access (tenant_id, feature_name, is_enabled, expires_at)
    SELECT 
        tenant_uuid,
        unnest(ARRAY[
            'basic_pos', 'product_management', 'customer_management', 
            'sales_reporting', 'inventory_tracking', 'user_management',
            'advanced_reporting', 'api_access', 'multi_location',
            'accounting_integration', 'tax_management', 'commission_tracking',
            'loyalty_program', 'gift_cards', 'online_orders',
            'whatsapp_integration', 'email_marketing', 'analytics'
        ]),
        true,
        NOW() + INTERVAL '1 year'
    ON CONFLICT (tenant_id, feature_name) DO UPDATE SET
        is_enabled = true,
        expires_at = NOW() + INTERVAL '1 year',
        updated_at = NOW();
    
    RAISE NOTICE 'Fixed subscription for Walela tenant % with Enterprise plan %', tenant_uuid, enterprise_plan_id;
END $$;