# Payment Methods Cleanup and Consolidation

## Overview
This document outlines the cleanup of redundant payment method implementations and the consolidation into a centralized, consistent system.

## Issues Identified

### 1. Multiple Database Migrations with Conflicting Schemas
- **`20250714085327`**: Basic schema with `type` field
- **`20250729102008`**: Complex schema with `code`, `display_name`, `account_id` (required)
- **`20250729221726`**: Different schema with `type`, `processing_fee_percentage`, etc.
- **`20250725000002`**: Fix migration (should be the final one)

### 2. Multiple Payment Components with Duplicate Logic
- **`PaymentManagement.tsx`**: Admin interface for managing payment methods
- **`PaymentForm.tsx`**: Form for adding payments to purchases
- **`PaymentProcessor.tsx`**: Processor for sales payments
- **`ARAPPaymentProcessor.tsx`**: Another payment processor for AR/AP
- **`MpesaPaymentModal.tsx`**: M-Pesa specific payment modal

### 3. Duplicate Payment Method Fetching Logic
Each component had its own `fetchPaymentMethods` function with similar but slightly different logic.

## Solution Implemented

### 1. Centralized Hook: `usePaymentMethods`
Created `src/hooks/usePaymentMethods.ts` to provide:
- Centralized payment method fetching
- Account information enhancement
- Save/delete operations
- Active payment method filtering
- Default payment method fallbacks
- Error handling and loading states

### 2. Consolidated Database Schema
Created `supabase/migrations/20250725000003-cleanup-payment-methods-migrations.sql` to:
- Drop and recreate the payment_methods table with consistent schema
- Include all necessary fields: `type`, `processing_fee_percentage`, `account_id`, etc.
- Set up proper foreign key constraints
- Create performance indexes
- Establish correct RLS policies
- Insert default payment methods

### 3. Updated Components
- **`PaymentManagement.tsx`**: ✅ Now uses centralized hook, removed duplicate logic
- **`PaymentForm.tsx`**: ✅ Updated to use centralized hook, simplified interface
- **`PaymentProcessor.tsx`**: ✅ Updated to use centralized hook, improved UX
- **`ARAPPaymentProcessor.tsx`**: ✅ Updated to use centralized hook, streamlined interface
- **`MpesaPaymentModal.tsx`**: ✅ Updated to use centralized hook, simplified logic

## Benefits

### 1. Reduced Code Duplication
- Single source of truth for payment method logic
- Consistent error handling across components
- Unified data fetching patterns

### 2. Improved Maintainability
- Changes to payment method logic only need to be made in one place
- Easier to add new features or fix bugs
- Consistent behavior across all payment-related components

### 3. Better Performance
- Centralized caching of payment methods
- Reduced database queries
- Optimized data fetching with proper indexes

### 4. Enhanced Reliability
- Consistent error handling
- Proper fallback mechanisms
- Better type safety with centralized interfaces

## Migration Steps

### 1. Database Migration
Run the cleanup migration in Supabase:
```sql
-- Execute: supabase/migrations/20250725000003-cleanup-payment-methods-migrations.sql
```

### 2. Component Updates
- ✅ `PaymentManagement.tsx` - Updated to use centralized hook
- ✅ `PaymentForm.tsx` - Updated to use centralized hook
- ✅ `PaymentProcessor.tsx` - Updated to use centralized hook
- ✅ `ARAPPaymentProcessor.tsx` - Updated to use centralized hook
- ✅ `MpesaPaymentModal.tsx` - Updated to use centralized hook

### 3. Testing
- Test payment method creation/editing in admin interface
- Test payment processing in sales and purchases
- Verify account linking functionality
- Test fallback mechanisms when no payment methods are configured

## Remaining Tasks

### 1. ✅ Complete Component Updates
- ✅ Finish updating `PaymentForm.tsx` to use centralized hook
- ✅ Update `PaymentProcessor.tsx` to use centralized hook
- ✅ Update `ARAPPaymentProcessor.tsx` to use centralized hook
- ✅ Update `MpesaPaymentModal.tsx` to use centralized hook

### 2. Remove Old Migration Files
After confirming the cleanup migration works:
- Remove or mark as deprecated: `20250714085327`, `20250729102008`, `20250729221726`
- Keep only: `20250725000003-cleanup-payment-methods-migrations.sql`

### 3. Update Documentation
- Update API documentation
- Update component documentation
- Add usage examples for the centralized hook

## Schema Reference

### Final Payment Methods Table Schema
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
  account_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Hook Usage Example
```typescript
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

function MyComponent() {
  const {
    paymentMethods,
    loading,
    error,
    getActivePaymentMethods,
    savePaymentMethod,
    deletePaymentMethod,
  } = usePaymentMethods();

  // Use the centralized functionality
  const activeMethods = getActivePaymentMethods();
  
  // ... rest of component logic
}
```

## Component Usage Examples

### PaymentForm.tsx
```typescript
const { 
  paymentMethods, 
  loading: isLoadingMethods, 
  getActivePaymentMethods,
  getDefaultPaymentMethods 
} = usePaymentMethods();

// Get active payment methods for purchases (filter out credit)
const purchasePaymentMethods = getActivePaymentMethods().filter(method => method.type !== 'credit' as any);
```

### PaymentProcessor.tsx
```typescript
const { 
  paymentMethods, 
  loading: isLoadingMethods, 
  getActivePaymentMethods,
  getDefaultPaymentMethods 
} = usePaymentMethods();

// Get active payment methods for sales
const activePaymentMethods = getActivePaymentMethods();
```

### ARAPPaymentProcessor.tsx
```typescript
const { 
  paymentMethods, 
  loading: isLoadingMethods, 
  getActivePaymentMethods,
  getDefaultPaymentMethods 
} = usePaymentMethods();

// Get active payment methods for AR/AP
const activePaymentMethods = getActivePaymentMethods();
```

### MpesaPaymentModal.tsx
```typescript
const { 
  paymentMethods, 
  loading: isLoadingMethods, 
  getActivePaymentMethods,
  getPaymentMethodsByType 
} = usePaymentMethods();

// Get M-Pesa payment method
const mpesaMethods = getPaymentMethodsByType('mobile_money');
const mpesaMethod = mpesaMethods.find(m => m.name.toLowerCase().includes('mpesa'));
```

## Conclusion
This cleanup significantly reduces code duplication, improves maintainability, and provides a more robust foundation for payment method management across the application. The centralized approach ensures consistency and makes future enhancements easier to implement.

## Status: ✅ COMPLETED
All components have been successfully updated to use the centralized `usePaymentMethods` hook. The cleanup is now complete and ready for testing.
