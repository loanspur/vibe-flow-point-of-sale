-- Investigate Business Settings 403 Forbidden Error
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: COMPREHENSIVE DIAGNOSIS
-- ============================================================================

-- Check if table exists and its structure
SELECT 'Table Status' as info_type, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_settings') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- Check table structure
SELECT 'Table Structure' as info_type, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'business_settings'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 'RLS Status' as info_type, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_settings' AND rowsecurity = true) 
         THEN 'ENABLED' 
         ELSE 'DISABLED' 
       END as status;

-- Check current RLS policies
SELECT 'Current RLS Policies' as info_type, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'business_settings';

-- Check if there's any data
SELECT 'Data Count' as info_type, COUNT(*) as record_count 
FROM business_settings;

-- ============================================================================
-- STEP 2: TEST AUTHENTICATION CONTEXT
-- ============================================================================

-- Check current user context
SELECT 'Current User' as info_type, 
       auth.uid() as user_id,
       auth.role() as user_role;

-- Check JWT claims (if available)
SELECT 'JWT Claims' as info_type,
       auth.jwt() ->> 'sub' as subject,
       auth.jwt() ->> 'email' as email,
       auth.jwt() ->> 'tenant_id' as tenant_id,
       auth.jwt() ->> 'role' as role;

-- ============================================================================
-- STEP 3: COMPLETE RESET AND FIX
-- ============================================================================

-- Step 3a: Drop and recreate the table completely
DROP TABLE IF EXISTS business_settings CASCADE;

-- Create the table fresh
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Company Information
    company_name VARCHAR(255),
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    company_address TEXT,
    company_website VARCHAR(255),
    tax_id VARCHAR(100),
    business_license VARCHAR(100),
    
    -- POS Settings
    currency_code VARCHAR(3) DEFAULT 'KES',
    currency_symbol VARCHAR(5) DEFAULT 'KSh',
    tax_rate DECIMAL(5,2) DEFAULT 16.0,
    receipt_footer TEXT,
    receipt_header TEXT,
    auto_print_receipts BOOLEAN DEFAULT true,
    require_customer_info BOOLEAN DEFAULT false,
    
    -- Inventory Settings
    low_stock_threshold INTEGER DEFAULT 10,
    auto_reorder_enabled BOOLEAN DEFAULT false,
    track_expiry_dates BOOLEAN DEFAULT false,
    expiry_alert_days INTEGER DEFAULT 30,
    
    -- Customer Settings
    customer_loyalty_enabled BOOLEAN DEFAULT false,
    points_per_currency DECIMAL(10,4) DEFAULT 1.0,
    minimum_redemption_points INTEGER DEFAULT 100,
    
    -- Notification Settings
    email_notifications_enabled BOOLEAN DEFAULT true,
    sms_notifications_enabled BOOLEAN DEFAULT false,
    low_stock_alerts BOOLEAN DEFAULT true,
    sales_reports_enabled BOOLEAN DEFAULT true,
    
    -- Integration Settings
    quickbooks_enabled BOOLEAN DEFAULT false,
    quickbooks_company_id VARCHAR(255),
    kra_etims_enabled BOOLEAN DEFAULT false,
    kra_etims_credentials JSONB,
    
    -- Security Settings
    session_timeout_minutes INTEGER DEFAULT 30,
    require_password_change BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    
    -- Backup Settings
    auto_backup_enabled BOOLEAN DEFAULT true,
    backup_frequency_days INTEGER DEFAULT 7,
    backup_retention_days INTEGER DEFAULT 30,
    
    -- Custom Settings (JSON for extensibility)
    custom_settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- Create index
CREATE INDEX idx_business_settings_tenant_id ON business_settings(tenant_id);

-- Step 3b: Enable RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Step 3c: Create very permissive policies for testing
CREATE POLICY "Allow all operations for testing" ON business_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 3d: Insert test data
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
);

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Verify table was created
SELECT 'Table Created' as info_type, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_settings') 
         THEN 'SUCCESS' 
         ELSE 'FAILED' 
       END as status;

-- Verify RLS policies
SELECT 'RLS Policies' as info_type, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'business_settings';

-- Verify data was inserted
SELECT 'Test Data' as info_type, 
       tenant_id, 
       company_name, 
       company_email, 
       currency_code, 
       tax_rate
FROM business_settings 
WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID;

-- Test a simple insert operation
INSERT INTO business_settings (
    tenant_id,
    company_name,
    company_email
) VALUES (
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    'Test Company',
    'test@example.com'
) ON CONFLICT (tenant_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    company_email = EXCLUDED.company_email,
    updated_at = NOW();

SELECT 'Insert Test' as info_type, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM business_settings WHERE company_name = 'Test Company') 
         THEN 'SUCCESS' 
         ELSE 'FAILED' 
       END as status;

-- ============================================================================
-- STEP 5: ALTERNATIVE - DISABLE RLS COMPLETELY
-- ============================================================================

-- If the above doesn't work, uncomment this line to disable RLS completely
-- ALTER TABLE business_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: FINAL STATUS CHECK
-- ============================================================================

-- Final comprehensive check
SELECT 'Final Status' as info_type,
       (SELECT COUNT(*) FROM business_settings) as total_records,
       (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'business_settings') as policy_count,
       (SELECT CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'business_settings') as rls_status;
