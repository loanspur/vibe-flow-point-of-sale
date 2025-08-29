-- Diagnostic script for product_migrations table
-- Run this to see the current state before fixing

-- Check if table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_migrations'
    ) THEN 'Table EXISTS'
    ELSE 'Table DOES NOT EXIST'
  END as table_status;

-- If table exists, show its current structure
SELECT 
  'Current table structure:' as info,
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'product_migrations'
ORDER BY ordinal_position;

-- Check if indexes exist
SELECT 
  'Indexes:' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'product_migrations' 
AND schemaname = 'public';

-- Check if RLS is enabled
SELECT 
  'RLS Status:' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'product_migrations' 
AND schemaname = 'public';

-- Check RLS policies
SELECT 
  'RLS Policies:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'product_migrations' 
AND schemaname = 'public';

-- Test if we can insert a record (this will show the specific error)
DO $$
BEGIN
  INSERT INTO public.product_migrations (
    tenant_id,
    migration_type,
    file_name,
    total_records,
    status
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'import',
    'test.csv',
    1,
    'pending'
  );
  
  RAISE NOTICE 'Test insert successful - table is working correctly';
  
  -- Clean up test data
  DELETE FROM public.product_migrations WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert failed with error: %', SQLERRM;
END $$;
