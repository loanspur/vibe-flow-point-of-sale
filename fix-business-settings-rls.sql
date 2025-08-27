-- Fix RLS policies for business_settings table
-- Run this script in your Supabase SQL Editor to fix the RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can insert business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can update business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Users can delete business_settings for their tenant" ON business_settings;
DROP POLICY IF EXISTS "Allow all operations for testing" ON business_settings;

-- Create new policies that work with the current auth setup
CREATE POLICY "Users can view business_settings for their tenant" ON business_settings
    FOR SELECT 
    USING (
        tenant_id::text = (auth.jwt() ->> 'tenant_id') OR
        tenant_id::text = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can insert business_settings for their tenant" ON business_settings
    FOR INSERT 
    WITH CHECK (
        tenant_id::text = (auth.jwt() ->> 'tenant_id') OR
        tenant_id::text = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can update business_settings for their tenant" ON business_settings
    FOR UPDATE 
    USING (
        tenant_id::text = (auth.jwt() ->> 'tenant_id') OR
        tenant_id::text = (auth.jwt() ->> 'sub')
    )
    WITH CHECK (
        tenant_id::text = (auth.jwt() ->> 'tenant_id') OR
        tenant_id::text = (auth.jwt() ->> 'sub')
    );

CREATE POLICY "Users can delete business_settings for their tenant" ON business_settings
    FOR DELETE 
    USING (
        tenant_id::text = (auth.jwt() ->> 'tenant_id') OR
        tenant_id::text = (auth.jwt() ->> 'sub')
    );

-- Also create a more permissive policy for testing if needed
CREATE POLICY "Allow all operations for testing" ON business_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'business_settings';
