-- Fix RLS policies for entity lookups in migration system
-- This script addresses the 406 (Not Acceptable) errors for entity lookups

-- First, let's check what RLS policies exist on the problematic tables
SELECT 
  'Current store_locations RLS policies:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'store_locations' 
AND schemaname = 'public';

SELECT 
  'Current product_units RLS policies:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'product_units' 
AND schemaname = 'public';

-- Check if RLS is enabled on these tables
SELECT 
  'Table RLS status:' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('store_locations', 'product_units')
AND schemaname = 'public';

-- Drop ALL existing policies on store_locations and recreate them
DROP POLICY IF EXISTS "Users can view their tenant's locations" ON public.store_locations;
DROP POLICY IF EXISTS "Users can insert locations for their tenant" ON public.store_locations;
DROP POLICY IF EXISTS "Users can update locations for their tenant" ON public.store_locations;
DROP POLICY IF EXISTS "Users can delete locations for their tenant" ON public.store_locations;

-- Create comprehensive RLS policies for store_locations
CREATE POLICY "Users can view their tenant's locations" ON public.store_locations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert locations for their tenant" ON public.store_locations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update locations for their tenant" ON public.store_locations
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete locations for their tenant" ON public.store_locations
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Drop ALL existing policies on product_units and recreate them
DROP POLICY IF EXISTS "Users can view their tenant's units" ON public.product_units;
DROP POLICY IF EXISTS "Users can insert units for their tenant" ON public.product_units;
DROP POLICY IF EXISTS "Users can update units for their tenant" ON public.product_units;
DROP POLICY IF EXISTS "Users can delete units for their tenant" ON public.product_units;

-- Create comprehensive RLS policies for product_units
CREATE POLICY "Users can view their tenant's units" ON public.product_units
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert units for their tenant" ON public.product_units
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update units for their tenant" ON public.product_units
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete units for their tenant" ON public.product_units
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Also fix product_categories RLS policies
DROP POLICY IF EXISTS "Users can view their tenant's categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can insert categories for their tenant" ON public.product_categories;
DROP POLICY IF EXISTS "Users can update categories for their tenant" ON public.product_categories;
DROP POLICY IF EXISTS "Users can delete categories for their tenant" ON public.product_categories;

CREATE POLICY "Users can view their tenant's categories" ON public.product_categories
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories for their tenant" ON public.product_categories
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories for their tenant" ON public.product_categories
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories for their tenant" ON public.product_categories
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Test if we can now query these entities (this should work)
DO $$
DECLARE
  test_tenant_id UUID;
  location_count INTEGER;
  unit_count INTEGER;
  category_count INTEGER;
BEGIN
  -- Get the first tenant ID for testing
  SELECT id INTO test_tenant_id FROM tenants LIMIT 1;
  
  IF test_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenants found in the system';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing entity lookups for tenant ID: %', test_tenant_id;
  
  -- Test store_locations lookup
  SELECT COUNT(*) INTO location_count 
  FROM store_locations 
  WHERE tenant_id = test_tenant_id 
  AND name IN ('Main Store', 'Warehouse') 
  AND is_active = true;
  
  RAISE NOTICE 'Found % store locations', location_count;
  
  -- Test product_units lookup
  SELECT COUNT(*) INTO unit_count 
  FROM product_units 
  WHERE tenant_id = test_tenant_id 
  AND name IN ('Pieces', 'Units') 
  AND is_active = true;
  
  RAISE NOTICE 'Found % product units', unit_count;
  
  -- Test product_categories lookup
  SELECT COUNT(*) INTO category_count 
  FROM product_categories 
  WHERE tenant_id = test_tenant_id 
  AND name IN ('Electronics', 'Clothing') 
  AND is_active = true;
  
  RAISE NOTICE 'Found % product categories', category_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error testing entity lookups: %', SQLERRM;
END $$;

-- Verify the updated policies
SELECT 
  'Updated store_locations RLS policies:' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'store_locations' 
AND schemaname = 'public';

SELECT 
  'Updated product_units RLS policies:' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'product_units' 
AND schemaname = 'public';

SELECT 'Entity lookup RLS policy fix completed successfully!' as status;
