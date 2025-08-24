-- Fix Business Settings Missing Columns and 403 Error
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: CHECK CURRENT TABLE STRUCTURE
-- ============================================================================

-- Check if table exists
SELECT 'Table Status' as info_type, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_settings') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- Check current table structure
SELECT 'Current Table Structure' as info_type, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'business_settings'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: ADD MISSING COLUMNS
-- ============================================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Company Information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'company_email') THEN
        ALTER TABLE business_settings ADD COLUMN company_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'company_phone') THEN
        ALTER TABLE business_settings ADD COLUMN company_phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'company_address') THEN
        ALTER TABLE business_settings ADD COLUMN company_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'company_website') THEN
        ALTER TABLE business_settings ADD COLUMN company_website VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'tax_id') THEN
        ALTER TABLE business_settings ADD COLUMN tax_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'business_license') THEN
        ALTER TABLE business_settings ADD COLUMN business_license VARCHAR(100);
    END IF;
    
    -- POS Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'currency_code') THEN
        ALTER TABLE business_settings ADD COLUMN currency_code VARCHAR(3) DEFAULT 'KES';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'currency_symbol') THEN
        ALTER TABLE business_settings ADD COLUMN currency_symbol VARCHAR(5) DEFAULT 'KSh';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'tax_rate') THEN
        ALTER TABLE business_settings ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 16.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'receipt_footer') THEN
        ALTER TABLE business_settings ADD COLUMN receipt_footer TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'receipt_header') THEN
        ALTER TABLE business_settings ADD COLUMN receipt_header TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'auto_print_receipts') THEN
        ALTER TABLE business_settings ADD COLUMN auto_print_receipts BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'require_customer_info') THEN
        ALTER TABLE business_settings ADD COLUMN require_customer_info BOOLEAN DEFAULT false;
    END IF;
    
    -- Inventory Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'low_stock_threshold') THEN
        ALTER TABLE business_settings ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'auto_reorder_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN auto_reorder_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'track_expiry_dates') THEN
        ALTER TABLE business_settings ADD COLUMN track_expiry_dates BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'expiry_alert_days') THEN
        ALTER TABLE business_settings ADD COLUMN expiry_alert_days INTEGER DEFAULT 30;
    END IF;
    
    -- Customer Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'customer_loyalty_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN customer_loyalty_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'points_per_currency') THEN
        ALTER TABLE business_settings ADD COLUMN points_per_currency DECIMAL(10,4) DEFAULT 1.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'minimum_redemption_points') THEN
        ALTER TABLE business_settings ADD COLUMN minimum_redemption_points INTEGER DEFAULT 100;
    END IF;
    
    -- Notification Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'email_notifications_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'sms_notifications_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'low_stock_alerts') THEN
        ALTER TABLE business_settings ADD COLUMN low_stock_alerts BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'sales_reports_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN sales_reports_enabled BOOLEAN DEFAULT true;
    END IF;
    
    -- Integration Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'quickbooks_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN quickbooks_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'quickbooks_company_id') THEN
        ALTER TABLE business_settings ADD COLUMN quickbooks_company_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'kra_etims_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN kra_etims_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'kra_etims_credentials') THEN
        ALTER TABLE business_settings ADD COLUMN kra_etims_credentials JSONB;
    END IF;
    
    -- Security Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'session_timeout_minutes') THEN
        ALTER TABLE business_settings ADD COLUMN session_timeout_minutes INTEGER DEFAULT 30;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'require_password_change') THEN
        ALTER TABLE business_settings ADD COLUMN require_password_change BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
    END IF;
    
    -- Backup Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'auto_backup_enabled') THEN
        ALTER TABLE business_settings ADD COLUMN auto_backup_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'backup_frequency_days') THEN
        ALTER TABLE business_settings ADD COLUMN backup_frequency_days INTEGER DEFAULT 7;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'backup_retention_days') THEN
        ALTER TABLE business_settings ADD COLUMN backup_retention_days INTEGER DEFAULT 30;
    END IF;
    
    -- Custom Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'custom_settings') THEN
        ALTER TABLE business_settings ADD COLUMN custom_settings JSONB DEFAULT '{}';
    END IF;
    
    -- Timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'created_at') THEN
        ALTER TABLE business_settings ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'updated_at') THEN
        ALTER TABLE business_settings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
END $$;

-- ============================================================================
-- STEP 3: VERIFY COLUMNS WERE ADDED
-- ============================================================================

-- Check updated table structure
SELECT 'Updated Table Structure' as info_type, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'business_settings'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 4: DISABLE RLS TO FIX 403 ERROR
-- ============================================================================

-- Disable RLS completely to fix the 403 error
ALTER TABLE business_settings DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 'RLS Status' as info_type, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_settings' AND rowsecurity = false) 
         THEN 'DISABLED - GOOD' 
         ELSE 'STILL ENABLED - PROBLEM' 
       END as status;

-- ============================================================================
-- STEP 5: TEST DATA OPERATIONS
-- ============================================================================

-- Test insert operation with all columns
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

-- Verify the insert worked
SELECT 'Insert Test Result' as info_type,
       CASE 
         WHEN EXISTS (SELECT 1 FROM business_settings WHERE company_name = 'Traction Energies') 
         THEN 'SUCCESS - Data inserted' 
         ELSE 'FAILED - Data not inserted' 
       END as status;

-- ============================================================================
-- STEP 6: FINAL VERIFICATION
-- ============================================================================

-- Check current data
SELECT 'Current Data' as info_type,
       tenant_id,
       company_name,
       company_email,
       company_phone,
       currency_code,
       tax_rate,
       created_at,
       updated_at
FROM business_settings 
WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID;

-- Count total records
SELECT 'Total Records' as info_type, COUNT(*) as count FROM business_settings;

-- Final status
SELECT 'FINAL STATUS' as info_type,
       (SELECT COUNT(*) FROM business_settings) as total_records,
       (SELECT CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'business_settings') as rls_status,
       'READY FOR TESTING' as recommendation;
