# Payment Methods Migration Consolidation

## Overview
This document outlines the consolidation of multiple conflicting payment methods migrations into a single, clean migration file.

## Problem
The payment methods table had multiple conflicting migrations that created schema inconsistencies:

### Conflicting Migrations (Now Backed Up):
- `20250714085327-8ae17cfd-0354-4ad8-8b5e-aff97b447cdb.sql` - Basic schema with `type` field
- `20250729102008-9326d80b-9b83-4d6e-99c2-3f730cff0249.sql` - Complex schema with `code`, `display_name`, `account_id` (required)
- `20250729221726-31eaaed7-12ca-4533-ac6b-c97b97a8b0c3.sql` - Different schema with `type`, `processing_fee_percentage`
- `20250725000002-fix-payment-methods-schema.sql` - Fix migration
- `20250725000003-cleanup-payment-methods-migrations.sql` - Cleanup migration
- `20250821201825_5d307ad5-8232-4fba-979e-1cb901a59aee.sql` - Add `account_id` column

### Issues with Multiple Migrations:
1. **Schema Conflicts**: Different field names (`code` vs `type`, `display_name` vs `name`)
2. **Constraint Conflicts**: Some required `account_id`, others made it optional
3. **Index Conflicts**: Multiple attempts to create the same indexes
4. **Policy Conflicts**: RLS policies created multiple times
5. **Environment Inconsistency**: Different schemas in different environments

## Solution

### Single Consolidated Migration
Created `20250105000000_consolidated_payment_methods_schema.sql` that:

1. **Drops and Recreates** the table to ensure clean state
2. **Consolidates All Fields** from all previous migrations
3. **Creates Proper Constraints** and foreign keys
4. **Sets Up RLS Policies** correctly
5. **Creates Performance Indexes**
6. **Includes Default Data** setup function

### Final Schema
```sql
CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'crypto', 'other')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_reference BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    processing_fee_percentage NUMERIC(5,2) DEFAULT 0.00,
    minimum_amount NUMERIC(15,2) DEFAULT 0.00,
    maximum_amount NUMERIC(15,2),
    display_order INTEGER DEFAULT 0,
    account_id UUID, -- Links to accounts table for accounting integration
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT fk_payment_methods_tenant 
        FOREIGN KEY (tenant_id) 
        REFERENCES public.tenants(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_payment_methods_account 
        FOREIGN KEY (account_id) 
        REFERENCES public.accounts(id) 
        ON DELETE SET NULL
);
```

### Features Included:
- ✅ **All Required Fields** from previous migrations
- ✅ **Proper Type Constraints** for payment method types
- ✅ **Accounting Integration** with `account_id` field
- ✅ **Performance Indexes** on key fields
- ✅ **RLS Security** with proper policies
- ✅ **Default Payment Methods** setup for existing tenants
- ✅ **Comprehensive Documentation** with comments

## Migration Process

### 1. Backup Existing Migrations
All conflicting migrations moved to `supabase/migrations/backup/`:
- `20250714085327-8ae17cfd-0354-4ad8-8b5e-aff97b447cdb.sql`
- `20250729102008-9326d80b-9b83-4d6e-99c2-3f730cff0249.sql`
- `20250729221726-31eaaed7-12ca-4533-ac6b-c97b97a8b0c3.sql`
- `20250725000002-fix-payment-methods-schema.sql`
- `20250725000003-cleanup-payment-methods-migrations.sql`
- `20250821201825_5d307ad5-8232-4fba-979e-1cb901a59aee.sql`

### 2. Create Consolidated Migration
New migration: `20250105000000_consolidated_payment_methods_schema.sql`

### 3. Apply Migration
Run the new migration in your Supabase environment:
```bash
supabase db push
```

## Benefits

### 1. Schema Consistency
- ✅ Single source of truth for payment methods schema
- ✅ Consistent across all environments
- ✅ No more conflicting field definitions

### 2. Performance
- ✅ Optimized indexes for common queries
- ✅ Proper foreign key constraints
- ✅ Efficient RLS policies

### 3. Maintainability
- ✅ Single migration file to maintain
- ✅ Clear documentation and comments
- ✅ Easy to understand and modify

### 4. Reliability
- ✅ Clean table recreation ensures no legacy issues
- ✅ Proper constraints prevent data inconsistencies
- ✅ Default data setup for existing tenants

## Testing

### Before Applying Migration:
1. **Backup your database** (especially payment_methods data)
2. **Test in development environment** first
3. **Verify existing payment methods** are preserved

### After Applying Migration:
1. **Verify table structure** matches expected schema
2. **Test payment method CRUD operations**
3. **Verify RLS policies** work correctly
4. **Test accounting integration** with account_id field
5. **Verify default payment methods** are created for tenants

## Rollback Plan

If issues occur, you can:
1. **Restore from backup** migrations in the backup folder
2. **Manually recreate** the table using the backup migrations
3. **Contact support** if data loss occurs

## Status: ✅ COMPLETED

The payment methods migration consolidation is complete and ready for deployment. All conflicting migrations have been backed up and replaced with a single, clean migration file.

