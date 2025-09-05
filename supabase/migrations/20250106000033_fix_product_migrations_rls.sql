-- Fix Product Migrations Table RLS Policy
-- This migration ensures that tenant admins can create and manage migration records
-- The issue is that the product_migrations table doesn't have proper RLS policies

-- First, ensure the product_migrations table exists with proper structure
CREATE TABLE IF NOT EXISTS public.product_migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    migration_type TEXT NOT NULL,
    file_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on the table
ALTER TABLE public.product_migrations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can manage product migrations for their tenant" ON public.product_migrations;
DROP POLICY IF EXISTS "Tenant users can manage product migrations" ON public.product_migrations;
DROP POLICY IF EXISTS "Allow authenticated users to manage product migrations" ON public.product_migrations;

-- Create a permissive RLS policy for product_migrations
-- This allows any authenticated user to manage migration records within their tenant
-- Use the secure function if available, otherwise fall back to direct query
CREATE POLICY "Allow authenticated users to manage product migrations"
ON public.product_migrations
FOR ALL
USING (
    auth.uid() IS NOT NULL AND (
        -- Try to use the secure function first
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_user_tenant_member') THEN
                is_user_tenant_member(tenant_id)
            ELSE
                -- Fallback to direct query
                tenant_id = (
                    SELECT COALESCE(p.tenant_id, tu.tenant_id)
                    FROM public.profiles p
                    LEFT JOIN public.tenant_users tu ON tu.user_id = p.user_id
                    WHERE p.user_id = auth.uid()
                    LIMIT 1
                )
        END
    )
);

-- Add comment for documentation
COMMENT ON TABLE public.product_migrations IS 'Tracks data migration operations for products and other entities';
COMMENT ON POLICY "Allow authenticated users to manage product migrations" ON public.product_migrations 
IS 'Allows authenticated users to manage migration records within their tenant';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_migrations_tenant_id ON public.product_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_migrations_status ON public.product_migrations(status);
CREATE INDEX IF NOT EXISTS idx_product_migrations_created_at ON public.product_migrations(created_at);
