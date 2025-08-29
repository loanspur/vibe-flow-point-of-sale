-- Diagnostic script to check product_migrations table structure
-- Run this first to see what columns currently exist

-- Check if the table exists
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
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'product_migrations' 
AND schemaname = 'public';

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'product_migrations' 
AND schemaname = 'public';

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'product_migrations' 
AND schemaname = 'public';
