# Database Constraint Fix Application Guide

## Issue
The bulk update migration feature fails with constraint violation error: `product_migrations_migration_type_check`

## Solution
Apply the SQL script to update the database constraint.

## Steps to Apply

### 1. Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query

### 2. Run the Fix Script
Copy and paste the entire contents of `fix_bulk_update_migration_constraint.sql` into the SQL Editor and execute it.

### 3. Verify the Fix
The script will:
- Show current constraint
- Drop the old constraint
- Create new constraint with 'bulk_update' included
- Test the fix with a sample insert
- Show verification results

### 4. Expected Output
You should see:
- Current constraint definition
- Updated constraint definition
- "Test insert for bulk_update successful!"
- "Bulk update migration constraint fix completed successfully!"

## Verification
After running the script, the bulk update feature should work without constraint errors.

## Rollback (if needed)
If issues occur, you can rollback by running:
```sql
ALTER TABLE public.product_migrations 
DROP CONSTRAINT IF EXISTS product_migrations_migration_type_check;

ALTER TABLE public.product_migrations 
ADD CONSTRAINT product_migrations_migration_type_check 
CHECK (migration_type IN ('import', 'export'));
```
