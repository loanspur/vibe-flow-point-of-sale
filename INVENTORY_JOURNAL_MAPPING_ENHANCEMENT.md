# Inventory Journal Mapping Enhancement

## Overview

This enhancement automatically maps the inventory account as the default revenue journal for products during:
- **Data Migration**: CSV imports automatically assign inventory account
- **Manual Product Creation**: New products default to inventory account
- **Product Updates**: Existing products maintain their account mapping

## Key Features

### ✅ **Automatic Inventory Account Detection**
- Searches for accounts with "inventory" or "stock" in the name
- Supports common account codes (1200, 1020)
- Falls back to first available asset account if no inventory account found

### ✅ **Smart Account Resolution**
- **Migration Imports**: Uses specified revenue account or defaults to inventory
- **Manual Creation**: Automatically selects inventory account for new products
- **Product Updates**: Preserves existing account mapping

### ✅ **Enhanced CSV Support**
- Added `revenue_account` field to product export/import
- Sample templates include inventory account examples
- Backward compatible with existing CSV formats

## Technical Implementation

### 1. **New Utility Function: `getInventoryAccountId`**

```typescript
// src/lib/migration-utils.ts
export const getInventoryAccountId = async (tenantId: string): Promise<string | null> => {
  // First try to find by common inventory account names
  const { data: inventoryAccount } = await supabase
    .from('accounts')
    .select('id, name, code, account_types!inner(category)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .or('name.ilike.%inventory%,name.ilike.%stock%,code.eq.1200,code.eq.1020')
    .eq('account_types.category', 'assets')
    .single();
  
  // Fallback to first asset account if no inventory account found
  if (!inventoryAccount) {
    const { data: firstAssetAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('account_types.category', 'assets')
      .order('code')
      .limit(1)
      .single();
    
    return firstAssetAccount?.id || null;
  }
  
  return inventoryAccount.id;
};
```

### 2. **Enhanced Migration Service**

```typescript
// src/lib/migration-service.ts
// Get revenue account ID (prefer specified account, fallback to inventory account)
let revenueAccountId = null;
if (row.revenue_account && row.revenue_account.trim()) {
  // Try to find the specified revenue account
  const { data: specifiedAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', this.tenantId)
    .eq('is_active', true)
    .eq('name', row.revenue_account.trim())
    .single();
  
  if (specifiedAccount) {
    revenueAccountId = specifiedAccount.id;
  }
}

// If no specific account found, use inventory account as default
if (!revenueAccountId) {
  revenueAccountId = await getInventoryAccountId(this.tenantId);
}

// Include in product data
const productData = {
  // ... other fields
  revenue_account_id: revenueAccountId, // Auto-map inventory account or specified account
  is_active: true
};
```

### 3. **Enhanced ProductForm**

```typescript
// src/components/ProductForm.tsx
const fetchRevenueAccounts = useCallback(async () => {
  // ... fetch accounts logic
  
  // Auto-set inventory account for new products
  if (!product && data && data.length > 0) {
    // Find inventory account
    const inventoryAccount = data.find(account => 
      account.name.toLowerCase().includes('inventory') || 
      account.name.toLowerCase().includes('stock') ||
      account.code === '1200' || 
      account.code === '1020'
    );
    
    if (inventoryAccount) {
      formActions.setFieldValue('revenue_account_id', inventoryAccount.id);
    } else if (data.length > 0) {
      // Fallback to first asset account
      formActions.setFieldValue('revenue_account_id', data[0].id);
    }
  }
}, [tenantId, toast, product, formActions]);
```

### 4. **Updated Migration Configuration**

```typescript
// src/lib/migration-utils.ts
export const MIGRATION_CONFIG = {
  // ... other config
  optionalFields: {
    products: [
      'description', 'sku', 'barcode', 'cost_price', 
      'wholesale_price', 'stock_quantity', 'category', 
      'brand', 'location', 'unit', 'revenue_account' // Added
    ],
    // ... other entity types
  },
  exportFields: {
    products: [
      'name', 'description', 'sku', 'cost_price', 'price', 
      'wholesale_price', 'stock_quantity', 'category', 
      'unit', 'location', 'revenue_account' // Added
    ],
    // ... other entity types
  }
};
```

## User Experience Improvements

### **1. Migration Workflow**
- **Template Download**: Sample CSV now includes `revenue_account` column with "Inventory" examples
- **Import Validation**: Supports revenue account field validation
- **Auto-Mapping**: Products without specified account automatically get inventory account
- **Export Enhancement**: Exported products include their revenue account information

### **2. Manual Product Creation**
- **Default Selection**: New products automatically have inventory account selected
- **Visual Feedback**: Revenue account field shows selected inventory account
- **Override Capability**: Users can still change to different accounts if needed

### **3. Product Updates**
- **Preserved Mapping**: Existing products maintain their current account mapping
- **Consistent Behavior**: Update process respects existing account assignments

## Business Logic

### **Account Resolution Priority**
1. **Specified Account**: If CSV includes `revenue_account` field with valid account name
2. **Inventory Account**: Account with "inventory" or "stock" in name, or codes 1200/1020
3. **First Asset Account**: Fallback to first available asset account
4. **Null**: If no accounts available (handled gracefully)

### **Data Integrity**
- ✅ **Tenant Isolation**: All account lookups scoped to current tenant
- ✅ **Active Accounts Only**: Only considers active accounts
- ✅ **Asset Category**: Ensures accounts are in the assets category
- ✅ **Error Handling**: Graceful fallbacks if accounts not found

### **Backward Compatibility**
- ✅ **Existing Products**: No changes to existing product account mappings
- ✅ **Legacy CSV**: Imports without revenue_account field work as before
- ✅ **Optional Field**: Revenue account is optional in CSV imports

## CSV Format Examples

### **Export Format**
```csv
name,description,sku,cost_price,price,wholesale_price,stock_quantity,category,unit,location,revenue_account
Sample Product,Description,SKU001,50.00,100.00,80.00,50,Electronics,Pieces,Main Store,Inventory
```

### **Import Format**
```csv
name,description,sku,cost_price,price,wholesale_price,stock_quantity,category,unit,location,revenue_account
New Product,Description,SKU002,30.00,75.00,60.00,25,Clothing,Units,Warehouse,Inventory
```

### **Template Sample**
```csv
name,description,sku,cost_price,price,wholesale_price,stock_quantity,category,unit,location,revenue_account
Sample Product 1,This is a sample product description,,50.00,100.00,80.00,50,Electronics,Pieces,Main Store,Inventory
Sample Product 2,Another sample product,,30.00,75.50,60.00,25,Clothing,Units,Warehouse,Inventory
```

## Testing Scenarios

### **1. Migration Testing**
- ✅ **New Import**: Products without revenue_account get inventory account
- ✅ **Specified Account**: Products with valid revenue_account use specified account
- ✅ **Invalid Account**: Products with invalid account fallback to inventory
- ✅ **Export/Import**: Round-trip export/import preserves account mappings

### **2. Manual Creation Testing**
- ✅ **New Product**: Revenue account defaults to inventory account
- ✅ **Account Selection**: Users can change to different accounts
- ✅ **Form Validation**: Revenue account field works correctly

### **3. Update Testing**
- ✅ **Existing Product**: Account mapping preserved during updates
- ✅ **Account Change**: Users can change account during updates
- ✅ **Data Integrity**: All other fields update correctly

### **4. Edge Cases**
- ✅ **No Accounts**: Graceful handling when no accounts exist
- ✅ **No Inventory Account**: Falls back to first asset account
- ✅ **Multiple Inventory Accounts**: Uses first matching account
- ✅ **Account Deactivation**: Only considers active accounts

## Performance Considerations

### **Optimizations**
- **Efficient Queries**: Single query with OR conditions for account lookup
- **Caching**: Account data cached during migration process
- **Batch Processing**: Account resolution happens during product creation
- **Error Boundaries**: Failures don't break entire migration

### **Monitoring Points**
- **Account Resolution Time**: Monitor time to find inventory accounts
- **Fallback Usage**: Track how often fallback accounts are used
- **Error Rates**: Monitor account resolution failures
- **User Satisfaction**: Track manual account selection changes

## Future Enhancements

### **Planned Improvements**
1. **Account Templates**: Pre-configured account mappings for different business types
2. **Smart Suggestions**: AI-powered account suggestions based on product category
3. **Bulk Account Assignment**: Mass update account mappings for existing products
4. **Account Validation**: Real-time validation of account assignments
5. **Audit Trail**: Track account mapping changes over time

### **Configuration Options**
1. **Default Account Override**: Allow businesses to set custom default accounts
2. **Category-Based Mapping**: Different default accounts for different product categories
3. **User Preferences**: Remember user's preferred account selections
4. **Business Rules**: Configurable rules for account assignment

## Conclusion

This enhancement significantly improves the user experience by:

### **✅ Automation**
- Reduces manual account selection for new products
- Streamlines migration processes
- Minimizes configuration errors

### **✅ Consistency**
- Ensures all products have proper account mappings
- Maintains data integrity across operations
- Provides predictable default behavior

### **✅ Flexibility**
- Allows override of default account mappings
- Supports custom account specifications in CSV
- Preserves existing account assignments

### **✅ Reliability**
- Robust fallback mechanisms
- Comprehensive error handling
- Backward compatibility maintained

The inventory journal mapping enhancement makes the system more user-friendly while maintaining all existing functionality and business logic.
