-- Diagnostic script to identify business settings and locations issues

-- 1. Check if business_settings table exists and has proper structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'business_settings' 
ORDER BY ordinal_position;

-- 2. Check if store_locations table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'store_locations' 
ORDER BY ordinal_position;

-- 3. Check RLS status for business_settings
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'business_settings';

-- 4. Check RLS policies for business_settings
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'business_settings';

-- 5. Check RLS status for store_locations
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'store_locations';

-- 6. Check RLS policies for store_locations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'store_locations';

-- 7. Check existing business settings data
SELECT 
    tenant_id,
    company_name,
    currency_code,
    created_at,
    updated_at
FROM business_settings 
LIMIT 10;

-- 8. Check existing store locations data
SELECT 
    tenant_id,
    name,
    is_primary,
    is_active,
    created_at,
    updated_at
FROM store_locations 
LIMIT 10;

-- 9. Test insert permissions for business_settings
-- This will help identify if RLS is blocking operations
DO $$
DECLARE
    test_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
    result BOOLEAN;
BEGIN
    -- Test if we can insert into business_settings
    BEGIN
        INSERT INTO business_settings (tenant_id, company_name, currency_code)
        VALUES (test_tenant_id, 'Test Company', 'USD');
        
        -- If we get here, insert worked
        RAISE NOTICE 'INSERT into business_settings: SUCCESS';
        
        -- Clean up test data
        DELETE FROM business_settings WHERE tenant_id = test_tenant_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'INSERT into business_settings: FAILED - %', SQLERRM;
    END;
    
    -- Test if we can insert into store_locations
    BEGIN
        INSERT INTO store_locations (tenant_id, name, is_primary)
        VALUES (test_tenant_id, 'Test Location', true);
        
        -- If we get here, insert worked
        RAISE NOTICE 'INSERT into store_locations: SUCCESS';
        
        -- Clean up test data
        DELETE FROM store_locations WHERE tenant_id = test_tenant_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'INSERT into store_locations: FAILED - %', SQLERRM;
    END;
END $$;
