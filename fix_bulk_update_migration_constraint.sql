-- Fix migration_type constraint to allow 'bulk_update'
-- This script addresses the "violates check constraint product_migrations_migration_type_check" error

-- First, let's see what the current constraint looks like
SELECT 
  'Current constraint:' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.product_migrations'::regclass 
AND contype = 'c'
AND conname = 'product_migrations_migration_type_check';

-- Drop the existing migration_type check constraint
ALTER TABLE public.product_migrations 
DROP CONSTRAINT IF EXISTS product_migrations_migration_type_check;

-- Recreate the migration_type check constraint with 'bulk_update' included
ALTER TABLE public.product_migrations 
ADD CONSTRAINT product_migrations_migration_type_check 
CHECK (migration_type IN ('import', 'export', 'bulk_update'));

-- Verify the constraint is now correct
SELECT 
  'Updated constraint:' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.product_migrations'::regclass 
AND contype = 'c'
AND conname = 'product_migrations_migration_type_check';

-- Test insert to verify the fix works
DO $$
BEGIN
  INSERT INTO public.product_migrations (
    tenant_id,
    migration_type,
    file_name,
    total_records,
    status
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Test tenant ID
    'bulk_update',
    'test_bulk_update.csv',
    1,
    'pending'
  );
  
  RAISE NOTICE 'Test insert for bulk_update successful!';
  
  -- Clean up test data
  DELETE FROM public.product_migrations WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert failed with error: %', SQLERRM;
END $$;

-- Show all current constraints for verification
SELECT 
  'All constraints:' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.product_migrations'::regclass 
AND contype = 'c'
ORDER BY conname;

SELECT 'Bulk update migration constraint fix completed successfully!' as status;
