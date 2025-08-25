-- Diagnostic and Fix Script for Business Settings
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: DIAGNOSE CURRENT TABLE STATE
-- ============================================================================

-- Check if table exists
SELECT 'Table exists' as status, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'business_settings';

-- Check current table structure
SELECT 'Current columns' as status, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'business_settings'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: FIX MISSING COLUMNS (if needed)
-- ============================================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Check and add company_email column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'company_email'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN company_email VARCHAR(255);
        RAISE NOTICE 'Added company_email column';
    END IF;

    -- Check and add company_phone column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'company_phone'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN company_phone VARCHAR(50);
        RAISE NOTICE 'Added company_phone column';
    END IF;

    -- Check and add company_address column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'company_address'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN company_address TEXT;
        RAISE NOTICE 'Added company_address column';
    END IF;

    -- Check and add company_website column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'company_website'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN company_website VARCHAR(255);
        RAISE NOTICE 'Added company_website column';
    END IF;

    -- Check and add tax_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'tax_id'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN tax_id VARCHAR(100);
        RAISE NOTICE 'Added tax_id column';
    END IF;

    -- Check and add business_license column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'business_license'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN business_license VARCHAR(100);
        RAISE NOTICE 'Added business_license column';
    END IF;

    -- Check and add currency_symbol column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'currency_symbol'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN currency_symbol VARCHAR(5) DEFAULT 'KSh';
        RAISE NOTICE 'Added currency_symbol column';
    END IF;

    -- Check and add receipt_footer column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'receipt_footer'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN receipt_footer TEXT;
        RAISE NOTICE 'Added receipt_footer column';
    END IF;

    -- Check and add receipt_header column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'receipt_header'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN receipt_header TEXT;
        RAISE NOTICE 'Added receipt_header column';
    END IF;

    -- Check and add auto_print_receipts column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'auto_print_receipts'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN auto_print_receipts BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added auto_print_receipts column';
    END IF;

    -- Check and add require_customer_info column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'require_customer_info'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN require_customer_info BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added require_customer_info column';
    END IF;

    -- Check and add low_stock_threshold column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'low_stock_threshold'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
        RAISE NOTICE 'Added low_stock_threshold column';
    END IF;

    -- Check and add auto_reorder_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'auto_reorder_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN auto_reorder_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added auto_reorder_enabled column';
    END IF;

    -- Check and add track_expiry_dates column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'track_expiry_dates'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN track_expiry_dates BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added track_expiry_dates column';
    END IF;

    -- Check and add expiry_alert_days column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'expiry_alert_days'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN expiry_alert_days INTEGER DEFAULT 30;
        RAISE NOTICE 'Added expiry_alert_days column';
    END IF;

    -- Check and add customer_loyalty_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'customer_loyalty_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN customer_loyalty_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added customer_loyalty_enabled column';
    END IF;

    -- Check and add points_per_currency column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'points_per_currency'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN points_per_currency DECIMAL(10,4) DEFAULT 1.0;
        RAISE NOTICE 'Added points_per_currency column';
    END IF;

    -- Check and add minimum_redemption_points column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'minimum_redemption_points'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN minimum_redemption_points INTEGER DEFAULT 100;
        RAISE NOTICE 'Added minimum_redemption_points column';
    END IF;

    -- Check and add email_notifications_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'email_notifications_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added email_notifications_enabled column';
    END IF;

    -- Check and add sms_notifications_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'sms_notifications_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added sms_notifications_enabled column';
    END IF;

    -- Check and add low_stock_alerts column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'low_stock_alerts'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN low_stock_alerts BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added low_stock_alerts column';
    END IF;

    -- Check and add sales_reports_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'sales_reports_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN sales_reports_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added sales_reports_enabled column';
    END IF;

    -- Check and add quickbooks_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'quickbooks_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN quickbooks_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added quickbooks_enabled column';
    END IF;

    -- Check and add quickbooks_company_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'quickbooks_company_id'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN quickbooks_company_id VARCHAR(255);
        RAISE NOTICE 'Added quickbooks_company_id column';
    END IF;

    -- Check and add kra_etims_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'kra_etims_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN kra_etims_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added kra_etims_enabled column';
    END IF;

    -- Check and add kra_etims_credentials column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'kra_etims_credentials'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN kra_etims_credentials JSONB;
        RAISE NOTICE 'Added kra_etims_credentials column';
    END IF;

    -- Check and add session_timeout_minutes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'session_timeout_minutes'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN session_timeout_minutes INTEGER DEFAULT 30;
        RAISE NOTICE 'Added session_timeout_minutes column';
    END IF;

    -- Check and add require_password_change column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'require_password_change'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN require_password_change BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added require_password_change column';
    END IF;

    -- Check and add two_factor_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'two_factor_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added two_factor_enabled column';
    END IF;

    -- Check and add auto_backup_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'auto_backup_enabled'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN auto_backup_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added auto_backup_enabled column';
    END IF;

    -- Check and add backup_frequency_days column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'backup_frequency_days'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN backup_frequency_days INTEGER DEFAULT 7;
        RAISE NOTICE 'Added backup_frequency_days column';
    END IF;

    -- Check and add backup_retention_days column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'backup_retention_days'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN backup_retention_days INTEGER DEFAULT 30;
        RAISE NOTICE 'Added backup_retention_days column';
    END IF;

    -- Check and add custom_settings column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings' 
        AND column_name = 'custom_settings'
    ) THEN
        ALTER TABLE business_settings ADD COLUMN custom_settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added custom_settings column';
    END IF;

END $$;

-- ============================================================================
-- STEP 3: VERIFY FIXED TABLE STRUCTURE
-- ============================================================================

-- Check updated table structure
SELECT 'Updated columns' as status, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'business_settings'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 4: INSERT OR UPDATE SAMPLE DATA
-- ============================================================================

-- Insert or update sample data
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
-- STEP 5: FINAL VERIFICATION
-- ============================================================================

-- Test the problematic query
SELECT 
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

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'business_settings';
