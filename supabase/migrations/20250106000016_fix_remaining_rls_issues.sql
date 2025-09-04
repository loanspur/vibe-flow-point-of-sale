-- ============================================================================
-- MIGRATION 10: FIX REMAINING RLS ISSUES
-- ============================================================================
-- This migration fixes the 3 remaining tables that need RLS attention

-- ============================================================================
-- PART 1: FIX BUSINESS_SETTINGS TABLE (NEEDS_RLS)
-- ============================================================================

-- 1.1: Enable RLS on business_settings table
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- 1.2: Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage business_settings for their tenant" ON public.business_settings;
DROP POLICY IF EXISTS "Authenticated users can manage business_settings for their tenant" ON public.business_settings;

-- 1.3: Create proper RLS policy
CREATE POLICY "Authenticated users can manage business_settings for their tenant" ON public.business_settings
    FOR ALL USING (public.check_tenant_access(tenant_id));

-- ============================================================================
-- PART 2: FIX EMAIL_BLACKLIST TABLE (NEEDS_POLICY)
-- ============================================================================

-- 2.1: Create RLS policy for email_blacklist
CREATE POLICY "Authenticated users can manage email_blacklist for their tenant" ON public.email_blacklist
    FOR ALL USING (public.check_tenant_access(tenant_id));

-- ============================================================================
-- PART 3: FIX EMAIL_CAMPAIGN_RECIPIENTS TABLE (NEEDS_POLICY)
-- ============================================================================

-- 3.1: Create RLS policy for email_campaign_recipients
CREATE POLICY "Authenticated users can manage email_campaign_recipients for their tenant" ON public.email_campaign_recipients
    FOR ALL USING (public.check_tenant_access(tenant_id));

-- ============================================================================
-- PART 4: VERIFY FIXES
-- ============================================================================

-- 4.1: Check the status of the fixed tables
SELECT 
    'business_settings' as table_name,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_settings' AND column_name = 'tenant_id') as has_tenant_id,
    EXISTS(SELECT 1 FROM pg_class WHERE relname = 'business_settings' AND relrowsecurity = true) as rls_enabled,
    EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_settings') as has_policy,
    'FIXED' as status

UNION ALL

SELECT 
    'email_blacklist' as table_name,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_blacklist' AND column_name = 'tenant_id') as has_tenant_id,
    EXISTS(SELECT 1 FROM pg_class WHERE relname = 'email_blacklist' AND relrowsecurity = true) as rls_enabled,
    EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_blacklist') as has_policy,
    'FIXED' as status

UNION ALL

SELECT 
    'email_campaign_recipients' as table_name,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_campaign_recipients' AND column_name = 'tenant_id') as has_tenant_id,
    EXISTS(SELECT 1 FROM pg_class WHERE relname = 'email_campaign_recipients' AND relrowsecurity = true) as rls_enabled,
    EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_campaign_recipients') as has_policy,
    'FIXED' as status;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables with tenant_id should now be COMPLIANT
