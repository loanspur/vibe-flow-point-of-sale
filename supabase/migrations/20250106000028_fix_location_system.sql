-- Fix Location System for Purchase Form
-- This migration ensures locations are properly set up and accessible

-- ============================================================================
-- PART 1: ENSURE STORE_LOCATIONS TABLE EXISTS AND IS PROPERLY CONFIGURED
-- ============================================================================

-- Create store_locations table if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS public.store_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  state_province text NOT NULL,
  postal_code text,
  country text NOT NULL DEFAULT 'United States',
  phone text,
  email text,
  manager_name text,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Add any missing columns to existing table
DO $$ 
BEGIN
    -- Add address_line_1 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'address_line_1') THEN
        ALTER TABLE public.store_locations ADD COLUMN address_line_1 text;
    END IF;
    
    -- Add address_line_2 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'address_line_2') THEN
        ALTER TABLE public.store_locations ADD COLUMN address_line_2 text;
    END IF;
    
    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'city') THEN
        ALTER TABLE public.store_locations ADD COLUMN city text;
    END IF;
    
    -- Add state_province column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'state_province') THEN
        ALTER TABLE public.store_locations ADD COLUMN state_province text;
    END IF;
    
    -- Add postal_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'postal_code') THEN
        ALTER TABLE public.store_locations ADD COLUMN postal_code text;
    END IF;
    
    -- Add country column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'country') THEN
        ALTER TABLE public.store_locations ADD COLUMN country text DEFAULT 'United States';
    END IF;
    
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'phone') THEN
        ALTER TABLE public.store_locations ADD COLUMN phone text;
    END IF;
    
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'email') THEN
        ALTER TABLE public.store_locations ADD COLUMN email text;
    END IF;
    
    -- Add manager_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'manager_name') THEN
        ALTER TABLE public.store_locations ADD COLUMN manager_name text;
    END IF;
    
    -- Add is_primary column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'is_primary') THEN
        ALTER TABLE public.store_locations ADD COLUMN is_primary boolean DEFAULT false;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'store_locations' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.store_locations ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- ============================================================================
-- PART 2: ENABLE RLS AND CREATE PERMISSIVE POLICIES
-- ============================================================================

-- Enable RLS on store_locations
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Tenant managers can manage locations" ON public.store_locations;
DROP POLICY IF EXISTS "Tenant users can view locations" ON public.store_locations;
DROP POLICY IF EXISTS "Authenticated users can manage store_locations for their tenant" ON public.store_locations;

-- Create comprehensive RLS policies for store_locations
CREATE POLICY "Users can view locations for their tenant"
ON public.store_locations
FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (
    get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role, 'user'::user_role])
    OR auth.uid() IS NOT NULL
  )
);

CREATE POLICY "Users can manage locations for their tenant"
ON public.store_locations
FOR ALL
USING (
  tenant_id = get_user_tenant_id()
  AND (
    get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
    OR auth.uid() IS NOT NULL
  )
);

-- ============================================================================
-- PART 3: CREATE DEFAULT LOCATIONS FOR ALL TENANTS
-- ============================================================================

-- Insert default location for existing tenants that don't have any locations
INSERT INTO public.store_locations (
  tenant_id, 
  name, 
  address_line_1, 
  city, 
  state_province, 
  country, 
  is_primary, 
  is_active
)
SELECT DISTINCT 
  t.id, 
  'Main Location', 
  'Main Business Address',
  'City',
  'State/Province',
  'United States',
  true, 
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_locations sl 
  WHERE sl.tenant_id = t.id
);

-- ============================================================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_store_locations_tenant_id ON public.store_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_is_primary ON public.store_locations(tenant_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_store_locations_is_active ON public.store_locations(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- PART 5: VERIFICATION QUERIES
-- ============================================================================

-- Check if locations exist for all tenants
SELECT 
  'Location Setup Verification' as check_type,
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT sl.tenant_id) as tenants_with_locations,
  COUNT(sl.id) as total_locations
FROM public.tenants t
LEFT JOIN public.store_locations sl ON t.id = sl.tenant_id AND sl.is_active = true;

-- Show locations for current tenant (if any)
SELECT 
  'Current Tenant Locations' as info_type,
  sl.id::text,
  sl.name,
  sl.is_primary,
  sl.is_active,
  sl.tenant_id::text
FROM public.store_locations sl
WHERE sl.tenant_id = get_user_tenant_id()
ORDER BY sl.is_primary DESC, sl.name;
