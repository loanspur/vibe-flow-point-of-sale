-- Fix critical security vulnerability in contacts table RLS policies
-- Remove the dangerous "Allow all contact reads" policy that exposes customer data publicly

-- Drop the overly permissive policy that allows unrestricted access
DROP POLICY IF EXISTS "Allow all contact reads" ON public.contacts;

-- Ensure we have proper tenant-based access control
-- The existing policies already provide appropriate access:
-- - "Tenant managers can manage contacts" - for admin operations
-- - "Users can view contacts from their tenant" - for tenant-specific access
-- - Other CRUD policies are appropriately scoped to tenant membership

-- Add a comment for security audit trail
COMMENT ON TABLE public.contacts IS 'Customer contact information - access restricted by tenant membership and user roles for data protection';

-- Verify no other public access policies exist
-- (The remaining policies already properly restrict access to tenant members only)