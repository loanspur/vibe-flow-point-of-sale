-- Business Settings Database Schema (Fixed Version)
-- Run this SQL in your Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- BUSINESS SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_settings (
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

-- Indexes for business_settings
CREATE INDEX IF NOT EXISTS idx_business_settings_tenant_id ON business_settings(tenant_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can insert business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can update business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can delete business_settings for their tenant" ON business_settings;

-- Create policies for business_settings
CREATE POLICY "Users can view business_settings for their tenant" ON business_settings
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can insert business_settings for their tenant" ON business_settings
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can update business_settings for their tenant" ON business_settings
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can delete business_settings for their tenant" ON business_settings
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at column
CREATE TRIGGER update_business_settings_updated_at 
    BEFORE UPDATE ON business_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert default business settings for existing tenant
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
-- VERIFICATION QUERIES (Fixed)
-- ============================================================================

-- Verify table was created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'business_settings';

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'business_settings'
ORDER BY ordinal_position;

-- Verify sample data was inserted (using only existing columns)
SELECT 
    tenant_id, 
    company_name, 
    company_email, 
    currency_code, 
    tax_rate,
    created_at
FROM business_settings 
WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'business_settings';

-- Count total records
SELECT COUNT(*) as total_business_settings FROM business_settings;
