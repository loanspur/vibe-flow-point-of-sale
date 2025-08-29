-- Fix product_migrations table constraint issue
-- This script addresses the "violates check constraint product_migrations_status_check" error

-- First, let's see what the current constraint looks like
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.product_migrations'::regclass 
AND contype = 'c';

-- Drop the existing status check constraint
ALTER TABLE public.product_migrations 
DROP CONSTRAINT IF EXISTS product_migrations_status_check;

-- Recreate the status check constraint with the correct values
ALTER TABLE public.product_migrations 
ADD CONSTRAINT product_migrations_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'));

-- Also fix the migration_type constraint if needed
ALTER TABLE public.product_migrations 
DROP CONSTRAINT IF EXISTS product_migrations_migration_type_check;

ALTER TABLE public.product_migrations 
ADD CONSTRAINT product_migrations_migration_type_check 
CHECK (migration_type IN ('import', 'export'));

-- Verify the constraints are now correct
SELECT 
  'Updated constraints:' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.product_migrations'::regclass 
AND contype = 'c';

-- Test insert to verify the fix works
INSERT INTO public.product_migrations (
  tenant_id,
  migration_type,
  file_name,
  total_records,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Test tenant ID
  'import',
  'test.csv',
  1,
  'pending'
) ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM public.product_migrations WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

SELECT 'Constraint fix completed successfully!' as status;
