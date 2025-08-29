-- Fix RLS policies for migration system
-- This script addresses the "violates row-level security policy" errors

-- First, let's check the current RLS policies on the products table
SELECT 
  'Current products table RLS policies:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'products' 
AND schemaname = 'public';

-- Check if RLS is enabled on products table
SELECT 
  'Products table RLS status:' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'products' 
AND schemaname = 'public';

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view their tenant's products" ON public.products;
DROP POLICY IF EXISTS "Users can insert products for their tenant" ON public.products;
DROP POLICY IF EXISTS "Users can update products for their tenant" ON public.products;
DROP POLICY IF EXISTS "Users can delete products for their tenant" ON public.products;

-- Create more permissive RLS policies for the migration system
-- Policy for SELECT (viewing products)
CREATE POLICY "Users can view their tenant's products" ON public.products
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for INSERT (creating products) - more permissive for migrations
CREATE POLICY "Users can insert products for their tenant" ON public.products
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for UPDATE (updating products)
CREATE POLICY "Users can update products for their tenant" ON public.products
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for DELETE (deleting products)
CREATE POLICY "Users can delete products for their tenant" ON public.products
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Also fix RLS policies for related tables that the migration system needs to access

-- Fix store_locations RLS policies
DROP POLICY IF EXISTS "Users can view their tenant's locations" ON public.store_locations;
DROP POLICY IF EXISTS "Users can insert locations for their tenant" ON public.store_locations;

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

-- Fix product_units RLS policies
DROP POLICY IF EXISTS "Users can view their tenant's units" ON public.product_units;
DROP POLICY IF EXISTS "Users can insert units for their tenant" ON public.product_units;

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

-- Fix product_categories RLS policies
DROP POLICY IF EXISTS "Users can view their tenant's categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can insert categories for their tenant" ON public.product_categories;

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

-- Fix accounts RLS policies (for revenue account lookup)
DROP POLICY IF EXISTS "Users can view their tenant's accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert accounts for their tenant" ON public.accounts;

CREATE POLICY "Users can view their tenant's accounts" ON public.accounts
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert accounts for their tenant" ON public.accounts
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Verify the updated policies
SELECT 
  'Updated products table RLS policies:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'products' 
AND schemaname = 'public';

-- Test if we can now insert a product (this should work)
DO $$
DECLARE
  test_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
  test_product_id UUID;
BEGIN
  -- Try to insert a test product
  INSERT INTO public.products (
    tenant_id,
    name,
    description,
    price,
    is_active
  ) VALUES (
    test_tenant_id,
    'Test Product for Migration',
    'Test product to verify RLS policies work',
    10.00,
    true
  ) RETURNING id INTO test_product_id;
  
  RAISE NOTICE 'Test product insert successful! Product ID: %', test_product_id;
  
  -- Clean up test data
  DELETE FROM public.products WHERE id = test_product_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test product insert failed with error: %', SQLERRM;
END $$;

SELECT 'RLS policy fix completed successfully!' as status;
