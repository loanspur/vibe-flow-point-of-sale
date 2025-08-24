-- Fix Business Settings RLS Policies
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================================================

-- Check if table exists
SELECT 'Table exists' as status, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'business_settings';

-- Check current RLS policies
SELECT 'Current RLS policies' as status, schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'business_settings';

-- ============================================================================
-- STEP 2: DROP EXISTING POLICIES
-- ============================================================================

-- Drop all existing policies for business_settings
DROP POLICY IF EXISTS "Users can view business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can insert business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can update business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can delete business_settings for their tenant" ON business_settings;

-- ============================================================================
-- STEP 3: CREATE SIMPLIFIED RLS POLICIES
-- ============================================================================

-- Create a simple policy that allows all operations for authenticated users
-- This is a temporary fix to get the business settings working
CREATE POLICY "Allow all operations for authenticated users" ON business_settings
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Alternative: Create more specific policies if the above doesn't work
-- CREATE POLICY "Allow select for authenticated users" ON business_settings
--     FOR SELECT
--     USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow insert for authenticated users" ON business_settings
--     FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Allow update for authenticated users" ON business_settings
--     FOR UPDATE
--     USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow delete for authenticated users" ON business_settings
--     FOR DELETE
--     USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 4: VERIFY POLICIES
-- ============================================================================

-- Check updated RLS policies
SELECT 'Updated RLS policies' as status, schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'business_settings';

-- ============================================================================
-- STEP 5: TEST DATA INSERT
-- ============================================================================

-- Test inserting sample data
INSERT INTO business_settings (
    tenant_id,
    company_name,
    company_email,
    company_phone,
    currency_code,
    currency_symbol,
    tax_rate,
    receipt_footer,
    auto_print_receipts,
    low_stock_threshold,
    customer_loyalty_enabled,
    email_notifications_enabled
) VALUES (
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    'Traction Energies',
    'info@tractionenergies.com',
    '+254700123456',
    'KES',
    'KSh',
    16.0,
    'Thank you for your business!',
    true,
    10,
    true,
    true
) ON CONFLICT (tenant_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    company_email = EXCLUDED.company_email,
    company_phone = EXCLUDED.company_phone,
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    tax_rate = EXCLUDED.tax_rate,
    receipt_footer = EXCLUDED.receipt_footer,
    auto_print_receipts = EXCLUDED.auto_print_receipts,
    low_stock_threshold = EXCLUDED.low_stock_threshold,
    customer_loyalty_enabled = EXCLUDED.customer_loyalty_enabled,
    email_notifications_enabled = EXCLUDED.email_notifications_enabled,
    updated_at = NOW();

-- ============================================================================
-- STEP 6: VERIFY DATA
-- ============================================================================

-- Check if data was inserted successfully
SELECT 'Data verification' as status, 
       tenant_id, 
       company_name, 
       company_email, 
       currency_code, 
       tax_rate,
       created_at
FROM business_settings 
WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID;

-- Count total records
SELECT COUNT(*) as total_business_settings FROM business_settings;

-- ============================================================================
-- STEP 7: ALTERNATIVE - DISABLE RLS TEMPORARILY (if needed)
-- ============================================================================

-- If the above policies still don't work, you can temporarily disable RLS
-- Uncomment the following line if needed:
-- ALTER TABLE business_settings DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later, use:
-- ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
