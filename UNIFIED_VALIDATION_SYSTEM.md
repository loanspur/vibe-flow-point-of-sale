# Unified Validation System for Product Management

## Overview

This document outlines the unified validation system implemented across all product-related features to ensure consistent, reliable, and maintainable CRUD operations. The system follows the pattern established in the Units tab and applies it uniformly across Products, Brands, Units, Categories, and other product-related entities.

## Architecture

### 1. Centralized Validation Schemas (`src/lib/validation-schemas.ts`)

All validation schemas are centralized in a single file using Zod for type-safe validation:

```typescript
// Product Schema - Comprehensive validation for products
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Product name is required").max(255, "Product name must be less than 255 characters"),
  sku: z.string().min(1, "SKU is required").max(100, "SKU must be less than 100 characters"),
  // ... other fields
});

// Brand Schema - Following the pattern from BrandManagement
export const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Brand name is required").max(255, "Brand name must be less than 255 characters"),
  // ... other fields
});

// Unit Schema - Following the pattern from UnitsManagement
export const unitSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  // ... other fields
});
```

### 2. Unified CRUD Hook (`src/hooks/useUnifiedCRUD.ts`)

A generic CRUD hook that provides consistent create, read, update, delete operations:

```typescript
export function useUnifiedCRUD<T = any>(options: UseUnifiedCRUDOptions) {
  // Provides create, update, delete mutations with:
  // - Automatic validation using Zod schemas
  // - Consistent error handling and toast notifications
  // - Automatic query invalidation
  // - Tenant isolation
}
```

### 3. Entity-Specific Hooks

Pre-configured hooks for each entity type:

```typescript
export function useProductCRUD() {
  return useUnifiedCRUD<ProductFormData>({
    entityName: 'Product',
    queryKey: ['products'],
    tableName: 'products',
    validationFn: validateProduct,
    transformData: (data) => ({
      // Ensure numeric fields are properly converted
      price: Number(data.price) || 0,
      // ... other transformations
    }),
  });
}

export function useBrandCRUD() {
  return useUnifiedCRUD<BrandFormData>({
    entityName: 'Brand',
    queryKey: ['brands'],
    tableName: 'brands',
    validationFn: validateBrand,
  });
}

export function useUnitCRUD() {
  return useUnifiedCRUD<UnitFormData>({
    entityName: 'Unit',
    queryKey: ['product_units'],
    tableName: 'product_units',
    validationFn: validateUnit,
    transformData: (data) => ({
      conversion_factor: Number(data.conversion_factor) || 1,
      base_unit_id: data.is_base_unit ? null : data.base_unit_id,
    }),
  });
}
```

## Implementation Status

### ✅ Completed

1. **Validation Schemas** (`src/lib/validation-schemas.ts`)
   - Product schema with comprehensive validation
   - Brand schema following existing pattern
   - Unit schema following existing pattern
   - Category, Subcategory, ProductVariant schemas
   - Stock Adjustment, Stock Transfer schemas
   - Business Settings schema

2. **Unified CRUD Hook** (`src/hooks/useUnifiedCRUD.ts`)
   - Generic CRUD operations with validation
   - Entity-specific hooks (useProductCRUD, useBrandCRUD, useUnitCRUD)
   - Automatic error handling and toast notifications
   - Query invalidation and cache management

3. **Brand Management** (`src/components/BrandManagement.tsx`)
   - ✅ Migrated to use unified validation system
   - ✅ Uses useBrandCRUD hook
   - ✅ TanStack Query for data fetching
   - ✅ Consistent error handling

### 🔄 In Progress

4. **Product Form** (`src/components/ProductForm.tsx`)
   - ⚠️ Complex multi-step form needs careful migration
   - ⚠️ Has custom validation logic that needs integration
   - ⚠️ Uses useFormState hook that needs replacement

### 📋 Pending

5. **Units Management** (`src/components/UnitsManagement.tsx`)
   - Already follows good patterns but needs integration with unified system

6. **Stock Management** (`src/components/StockManagement.tsx`)
   - Needs migration to unified validation

7. **Product Settings** (`src/components/ProductSettings.tsx`)
   - Needs integration with business settings schema

8. **Quick Create Dialogs**
   - QuickCreateCategoryDialog
   - QuickCreateUnitDialog
   - QuickCreateBrandDialog

## Migration Guide

### Step 1: Replace Custom Validation

**Before:**
```typescript
// Custom validation logic scattered throughout components
const validateForm = useCallback((data: Partial<ProductFormData>) => {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = 'Product name is required';
  // ... more custom validation
  return errors;
}, []);
```

**After:**
```typescript
// Use centralized Zod schema
import { productSchema, ProductFormData } from '@/lib/validation-schemas';

const form = useForm<ProductFormData>({
  resolver: zodResolver(productSchema),
  defaultValues: {
    name: '',
    sku: '',
    // ... other defaults
  },
});
```

### Step 2: Replace Manual CRUD Operations

**Before:**
```typescript
const onSubmit = async (data: ProductFormData) => {
  try {
    const { error } = await supabase
      .from('products')
      .insert({
        ...data,
        tenant_id: tenantId,
      });
    if (error) throw error;
    // Manual success handling
  } catch (error) {
    // Manual error handling
  }
};
```

**After:**
```typescript
const { create: createProduct, update: updateProduct } = useProductCRUD();

const onSubmit = async (data: ProductFormData) => {
  if (editingProduct) {
    updateProduct({ id: editingProduct.id, data });
  } else {
    createProduct(data);
  }
};
```

### Step 3: Replace Manual Data Fetching

**Before:**
```typescript
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

const fetchProducts = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    setProducts(data || []);
  } catch (error) {
    // Manual error handling
  } finally {
    setLoading(false);
  }
};
```

**After:**
```typescript
const { data: products = [], isLoading: loading } = useQuery({
  queryKey: ['products', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  },
  enabled: !!tenantId,
});
```

## Benefits

### 1. **Consistency**
- All product-related forms use the same validation patterns
- Consistent error messages and user experience
- Uniform CRUD operations across all entities

### 2. **Maintainability**
- Centralized validation rules
- Single source of truth for data schemas
- Easy to update validation rules across all components

### 3. **Type Safety**
- Zod schemas provide compile-time type checking
- TypeScript integration ensures type safety
- Automatic type inference for form data

### 4. **Performance**
- TanStack Query provides efficient caching
- Automatic query invalidation
- Optimistic updates for better UX

### 5. **Error Handling**
- Consistent error messages
- Automatic toast notifications
- Proper error boundaries

## Validation Rules Applied

### Product Validation
- **Name**: Required, max 255 characters
- **SKU**: Required, max 100 characters, unique
- **Price**: Positive number, required
- **Stock**: Non-negative number
- **Category**: Required
- **Unit**: Required if units enabled
- **Brand**: Optional

### Brand Validation
- **Name**: Required, max 255 characters
- **Description**: Optional
- **Logo URL**: Optional, URL format

### Unit Validation
- **Name**: Required, max 255 characters
- **Abbreviation**: Required, max 10 characters
- **Code**: Required, max 20 characters, unique
- **Conversion Factor**: Positive number

## Next Steps

1. **Complete Product Form Migration**
   - Replace useFormState with react-hook-form + zod
   - Integrate with useProductCRUD hook
   - Maintain multi-step form functionality

2. **Migrate Remaining Components**
   - Units Management (already follows good patterns)
   - Stock Management
   - Product Settings

3. **Add Advanced Validation**
   - Cross-field validation (e.g., price relationships)
   - Business rule validation
   - Conditional validation based on settings

4. **Performance Optimization**
   - Implement optimistic updates
   - Add batch operations
   - Optimize query patterns

## Testing

### Unit Tests
- Test validation schemas
- Test CRUD operations
- Test error handling

### Integration Tests
- Test form submissions
- Test data persistence
- Test error scenarios

### E2E Tests
- Test complete user workflows
- Test validation feedback
- Test error recovery

## Conclusion

The unified validation system provides a robust foundation for all product-related CRUD operations. By centralizing validation rules and using consistent patterns, we ensure maintainable, type-safe, and user-friendly forms across the entire product management system.

The system follows established patterns from the Units tab and extends them to provide a comprehensive solution for all product-related features. This approach eliminates code duplication, improves consistency, and makes the codebase more maintainable.
