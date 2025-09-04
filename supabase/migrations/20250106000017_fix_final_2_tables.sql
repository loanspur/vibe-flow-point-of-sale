-- ============================================================================
-- MIGRATION 11: FIX FINAL 2 TABLES
-- ============================================================================
-- This migration fixes the last 2 tables that need RLS policies

-- ============================================================================
-- PART 1: FIX TENANT_CUSTOM_PRICING TABLE (NEEDS_POLICY)
-- ============================================================================

-- 1.1: Create RLS policy for tenant_custom_pricing
CREATE POLICY "Authenticated users can manage tenant_custom_pricing for their tenant" ON public.tenant_custom_pricing
    FOR ALL USING (public.check_tenant_access(tenant_id));

-- ============================================================================
-- PART 2: FIX USER_ACTIVITY_PERMISSIONS TABLE (NEEDS_POLICY)
-- ============================================================================

-- 2.1: Create RLS policy for user_activity_permissions
CREATE POLICY "Authenticated users can manage user_activity_permissions for their tenant" ON public.user_activity_permissions
    FOR ALL USING (public.check_tenant_access(tenant_id));

-- ============================================================================
-- PART 3: VERIFY PERFECT COMPLIANCE
-- ============================================================================

-- 3.1: Check that all tables are now COMPLIANT
SELECT 
    COUNT(*) as total_tables_with_tenant_id,
    COUNT(CASE WHEN status = 'COMPLIANT' THEN 1 END) as compliant_tables,
    COUNT(CASE WHEN status != 'COMPLIANT' THEN 1 END) as non_compliant_tables
FROM public.check_rls_compliance() 
WHERE status != 'NO_TENANT_ID';

-- 3.2: Show any remaining non-compliant tables (should be 0)
SELECT * FROM public.check_rls_compliance() 
WHERE status != 'NO_TENANT_ID' AND status != 'COMPLIANT';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables with tenant_id should now be 100% COMPLIANT
