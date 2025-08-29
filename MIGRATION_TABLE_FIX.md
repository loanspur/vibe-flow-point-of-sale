# Migration Table Error Fix

## Issue Description

When trying to migrate data, the system shows the following error:
```
qwtybhvdbbkbcelisuek.supabase.co/rest/v1/product_migrations?select=*:1 Failed to load resource: the server responded with a status of 400 ()
```

**UPDATE**: After creating the table, you may encounter this additional error:
```
ERROR: 42703: column "error_message" of relation "public.product_migrations" does not exist
```

## Root Cause Analysis

The error occurs because the `product_migrations` table does not exist in the database, or it exists but is missing required columns. This table is required for the migration system to track import/export operations.

### **Missing Table/Columns**
- **Table Name**: `product_migrations`
- **Purpose**: Tracks migration operations for products, contacts, and categories
- **Status**: Table may not exist OR table exists but is missing columns
- **Impact**: All migration operations fail with 400 error

### **Code Dependencies**
The following functions in `src/lib/migration-utils.ts` depend on this table:
- `createMigrationRecord()` - Creates migration tracking records
- `updateMigrationRecord()` - Updates migration status and progress

## Solution

### **Step 1: Diagnose the Current State**

First, run the diagnostic script to see what currently exists:

```sql
-- Run check_product_migrations_table.sql
-- This will show you the current table structure
```

### **Step 2: Fix the Table Structure**

If the table exists but is missing columns, run the fix script:

```sql
-- Run fix_product_migrations_table.sql
-- This will add any missing columns and ensure proper structure
```

### **Step 3: Create the Table (if it doesn't exist)**

If the table doesn't exist at all, run the original creation script:

```sql
-- Run create_product_migrations_table.sql
-- This creates the complete table from scratch
```

## Complete Fix Process

### **Option A: If Table Doesn't Exist**

Run the complete table creation script:

```sql
-- Create product_migrations table for tracking migration operations
-- This table is required for the migration system to work properly

CREATE TABLE IF NOT EXISTS public.product_migrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  migration_type TEXT NOT NULL CHECK (migration_type IN ('import', 'export')),
  file_name TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Add comments for documentation
COMMENT ON TABLE public.product_migrations IS 'Tracks migration operations for products, contacts, and categories';
COMMENT ON COLUMN public.product_migrations.tenant_id IS 'Tenant ID for multi-tenancy';
COMMENT ON COLUMN public.product_migrations.migration_type IS 'Type of migration: import or export';
COMMENT ON COLUMN public.product_migrations.file_name IS 'Name of the file being processed';
COMMENT ON COLUMN public.product_migrations.total_records IS 'Total number of records in the file';
COMMENT ON COLUMN public.product_migrations.successful_records IS 'Number of successfully processed records';
COMMENT ON COLUMN public.product_migrations.failed_records IS 'Number of failed records';
COMMENT ON COLUMN public.product_migrations.status IS 'Current status of the migration';
COMMENT ON COLUMN public.product_migrations.error_message IS 'Error message if migration failed';
COMMENT ON COLUMN public.product_migrations.created_by IS 'User who initiated the migration';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_migrations_tenant_id ON public.product_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_migrations_status ON public.product_migrations(status);
CREATE INDEX IF NOT EXISTS idx_product_migrations_created_at ON public.product_migrations(created_at);
CREATE INDEX IF NOT EXISTS idx_product_migrations_type_status ON public.product_migrations(migration_type, status);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.product_migrations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their tenant's migrations
CREATE POLICY "Users can view their tenant's migrations" ON public.product_migrations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to insert migrations for their tenant
CREATE POLICY "Users can insert migrations for their tenant" ON public.product_migrations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to update migrations for their tenant
CREATE POLICY "Users can update migrations for their tenant" ON public.product_migrations
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_product_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_migrations_updated_at
  BEFORE UPDATE ON public.product_migrations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_migrations_updated_at();
```

### **Option B: If Table Exists but is Missing Columns**

Run the fix script that adds missing columns:

```sql
-- Run the complete fix_product_migrations_table.sql script
-- This will add any missing columns and ensure proper structure
```

## Quick Fix Commands

### **1. Check Current State**
```sql
-- Run this first to see what exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_migrations'
    ) THEN 'Table EXISTS'
    ELSE 'Table DOES NOT EXIST'
  END as table_status;
```

### **2. Add Missing Column (if error_message is missing)**
```sql
-- Add the specific missing column
ALTER TABLE public.product_migrations ADD COLUMN IF NOT EXISTS error_message TEXT;
```

### **3. Verify the Fix**
```sql
-- Check that all required columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'product_migrations'
ORDER BY ordinal_position;
```

## Step-by-Step Resolution

### **Step 1: Run Diagnostic**
1. Open your Supabase SQL editor
2. Run `check_product_migrations_table.sql`
3. Note the current table structure

### **Step 2: Apply Fix**
1. If table doesn't exist: Run `create_product_migrations_table.sql`
2. If table exists but missing columns: Run `fix_product_migrations_table.sql`

### **Step 3: Verify Fix**
1. Run the diagnostic script again
2. Check that all required columns exist
3. Test the migration functionality

### **Step 4: Test Migration**
1. Go to the Migration tab in the Products page
2. Try downloading a template
3. Try importing/exporting data
4. Verify no errors occur

## Table Schema Details

### **Required Columns**
- `id` - Unique identifier (UUID)
- `tenant_id` - Tenant ID for multi-tenancy
- `migration_type` - Type of migration ('import' or 'export')
- `file_name` - Name of the file being processed
- `total_records` - Total number of records in the file
- `successful_records` - Number of successfully processed records
- `failed_records` - Number of failed records
- `status` - Current status ('pending', 'processing', 'completed', 'failed', 'partial')
- `error_message` - Error message if migration failed
- `created_at` - When the migration was created
- `updated_at` - When the migration was last updated
- `completed_at` - When the migration was completed
- `created_by` - User who initiated the migration

### **Indexes**
- `idx_product_migrations_tenant_id` - For tenant-based queries
- `idx_product_migrations_status` - For status-based filtering
- `idx_product_migrations_created_at` - For chronological ordering
- `idx_product_migrations_type_status` - For combined type and status queries

### **Security**
- **RLS Enabled**: Row Level Security is enabled
- **Tenant Isolation**: Users can only access their tenant's migrations
- **User Tracking**: All migrations are tracked by the user who initiated them

## Migration System Features

### **Supported Operations**
- **Import**: CSV file imports for products, contacts, and categories
- **Export**: CSV file exports for products, contacts, and categories
- **Progress Tracking**: Real-time progress updates during migration
- **Error Handling**: Detailed error reporting for failed records
- **Audit Trail**: Complete history of all migration operations

### **Status Tracking**
- `pending` - Migration is queued but not started
- `processing` - Migration is currently running
- `completed` - Migration completed successfully
- `failed` - Migration failed completely
- `partial` - Migration completed with some failures

## Testing the Fix

### **1. Basic Import Test**
1. Go to the Migration tab in the Products page
2. Select "Products" as the import type
3. Download a template
4. Fill in some sample data
5. Upload the CSV file
6. Verify the import completes without errors

### **2. Basic Export Test**
1. Go to the Migration tab in the Products page
2. Select "Products" as the export type
3. Click "Export Data"
4. Verify the export completes and downloads a CSV file

### **3. Error Handling Test**
1. Try importing a CSV with invalid data
2. Verify that failed records are tracked
3. Check that the migration status shows as "partial" or "failed"

## Prevention

### **Database Migration Best Practices**
1. **Always include table creation scripts** in your migration files
2. **Test migrations in development** before deploying to production
3. **Use IF NOT EXISTS** clauses to prevent conflicts
4. **Include proper indexes** for performance
5. **Set up RLS policies** for security

### **Code Review Checklist**
- [ ] All required tables exist in the database
- [ ] Table schemas match the code expectations
- [ ] RLS policies are properly configured
- [ ] Indexes are created for performance
- [ ] Error handling is implemented

## Conclusion

This fix resolves the migration system error by ensuring the `product_migrations` table exists with all required columns. After applying this fix:

### **✅ Immediate Benefits**
- Migration operations will work without errors
- Progress tracking will be available
- Error reporting will be functional
- Audit trail will be maintained

### **✅ Long-term Benefits**
- Robust migration system for data management
- Better user experience with progress tracking
- Improved debugging capabilities
- Compliance with data migration best practices

The migration system will now be fully functional and ready for production use.
