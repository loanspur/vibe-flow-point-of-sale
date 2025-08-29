import { supabase } from '@/integrations/supabase/client';

// Migration configuration
export const MIGRATION_CONFIG = {
  // Required fields for different entity types
  requiredFields: {
    products: ['name', 'price'],
    contacts: ['name', 'type'],
    categories: ['name']
  },
  
  // Optional fields for different entity types
  optionalFields: {
    products: ['description', 'sku', 'barcode', 'cost_price', 'wholesale_price', 'stock_quantity', 'category', 'brand', 'location', 'unit', 'revenue_account'],
    contacts: ['email', 'phone', 'company', 'address', 'notes'],
    categories: ['description', 'color']
  },
  
  // Table mappings for entity resolution
  tableMappings: {
    categories: {
      table: 'product_categories',
      fields: ['id', 'name', 'is_active'],
      tenantField: 'tenant_id'
    },
    units: {
      table: 'product_units',
      fields: ['id', 'name', 'is_active'],
      tenantField: 'tenant_id'
    },
    locations: {
      table: 'store_locations',
      fields: ['id', 'name', 'is_active'],
      tenantField: 'tenant_id'
    }
  },
  
  // Export field mappings
  exportFields: {
    products: ['name', 'description', 'sku', 'cost_price', 'price', 'wholesale_price', 'stock_quantity', 'category', 'unit', 'location', 'revenue_account'],
    contacts: ['name', 'type', 'email', 'phone', 'company', 'address', 'notes'],
    categories: ['name', 'description', 'color']
  }
};

// Centralized SKU generation with latest logic
export const generateUniqueSKU = async (productName: string, tenantId: string): Promise<string> => {
  if (!productName || !tenantId) return '';
  
  // Generate SKU from product name: Take first 3 letters + timestamp + random
  const namePrefix = productName
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 3)
    .toUpperCase();
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random number
    const potentialSKU = `${namePrefix}${timestamp}${randomSuffix}`;
    
    // Check if SKU exists in database
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('sku', potentialSKU)
      .maybeSingle();
    
    if (!existingProduct) {
      return potentialSKU;
    }
    
    attempts++;
    // Add small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  
  // Fallback: use UUID-like suffix if all attempts failed
  const fallbackSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${namePrefix}${fallbackSuffix}`;
};

// Centralized price mapping logic
export const mapProductPrices = (data: any) => {
  return {
    cost_price: parseFloat(data.cost_price) || 0,
    retail_price: parseFloat(data.price) || parseFloat(data.retail_price) || 0,
    wholesale_price: parseFloat(data.wholesale_price) || 0,
    price: parseFloat(data.price) || parseFloat(data.retail_price) || 0, // Backward compatibility
    purchase_price: parseFloat(data.cost_price) || 0 // For accounting integration
  };
};

// Centralized entity ID resolution
export const findEntityId = async (
  entityName: string, 
  entityType: keyof typeof MIGRATION_CONFIG.tableMappings, 
  tenantId: string
): Promise<string | null> => {
  if (!entityName || !tenantId) return null;
  
  const mapping = MIGRATION_CONFIG.tableMappings[entityType];
  
  const { data, error } = await supabase
    .from(mapping.table)
    .select('id')
    .eq(mapping.tenantField, tenantId)
    .eq('name', entityName.trim())
    .eq('is_active', true)
    .single();
  
  if (error || !data) return null;
  return data.id;
};

// Get inventory account ID for the tenant
export const getInventoryAccountId = async (tenantId: string): Promise<string | null> => {
  if (!tenantId) return null;
  
  try {
    // First try to find by common inventory account names
    const { data: inventoryAccount, error } = await supabase
      .from('accounts')
      .select(`
        id,
        name,
        code,
        account_types!inner(category)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .or('name.ilike.%inventory%,name.ilike.%stock%,code.eq.1200,code.eq.1020')
      .eq('account_types.category', 'assets')
      .single();
    
    if (error || !inventoryAccount) {
      // If no inventory account found, try to get the first asset account
      const { data: firstAssetAccount, error: assetError } = await supabase
        .from('accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('account_types.category', 'assets')
        .order('code')
        .limit(1)
        .single();
      
      if (assetError || !firstAssetAccount) {
        console.warn('No inventory or asset accounts found for tenant:', tenantId);
        return null;
      }
      
      return firstAssetAccount.id;
    }
    
    return inventoryAccount.id;
  } catch (error) {
    console.error('Error getting inventory account:', error);
    return null;
  }
};

// Centralized duplicate prevention
export const checkProductDuplicates = async (data: any, tenantId: string) => {
  const errors: string[] = [];
  
  // Check for duplicate product names
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('name', data.name)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existingProduct) {
    errors.push(`Product "${data.name}" already exists`);
  }

  // Check for duplicate SKU if provided
  if (data.sku && data.sku.trim()) {
    const { data: existingSKU } = await supabase
      .from('products')
      .select('id')
      .eq('sku', data.sku)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingSKU) {
      errors.push(`SKU "${data.sku}" already exists`);
    }
  }
  
  return errors;
};

// Centralized validation
export const validateImportData = (headers: string[], entityType: keyof typeof MIGRATION_CONFIG.requiredFields) => {
  const requiredFields = MIGRATION_CONFIG.requiredFields[entityType];
  const optionalFields = MIGRATION_CONFIG.optionalFields[entityType];
  
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const missing = requiredFields.filter(field => !lowerHeaders.includes(field.toLowerCase()));
  const valid = lowerHeaders.filter(h => 
    requiredFields.some(r => r.toLowerCase() === h) || 
    optionalFields.some(o => o.toLowerCase() === h)
  );
  
  return { 
    missing, 
    valid: valid.length, 
    total: headers.length,
    isValid: missing.length === 0
  };
};

// Centralized CSV processing
export const processCSVData = (csvText: string) => {
  try {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Validate headers
    if (headers.length === 0) {
      throw new Error('CSV file has no valid headers');
    }
    
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Skip rows without name
        if (!row.name || !row.name.trim()) continue;
        
        data.push(row);
      } catch (rowError) {
        console.error(`Error processing row ${i + 1}:`, rowError);
        throw new Error(`Error processing row ${i + 1}: ${rowError instanceof Error ? rowError.message : 'Invalid row format'}`);
      }
    }

    if (data.length === 0) {
      throw new Error('No valid data found in CSV file. Make sure your CSV has a header row and at least one data row with a name field.');
    }

    return { headers, data };
  } catch (error) {
    console.error('Error processing CSV data:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to process CSV file');
    }
  }
};

// Centralized migration tracking
export const createMigrationRecord = async (
  tenantId: string,
  migrationType: 'import' | 'export' | 'bulk_update',
  fileName: string,
  totalRecords: number
) => {
  const { data, error } = await supabase
    .from('product_migrations')
    .insert({
      tenant_id: tenantId,
      migration_type: migrationType,
      file_name: fileName,
      total_records: totalRecords,
      successful_records: 0,
      failed_records: 0,
      status: 'processing',
      created_at: new Date().toISOString(),
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating migration record:', error);
    throw new Error(`Failed to create migration record: ${error.message || 'Database error'}`);
  }
  return data;
};

export const updateMigrationRecord = async (
  migrationId: string,
  updates: {
    successful_records?: number;
    failed_records?: number;
    status?: 'completed' | 'failed' | 'partial';
    error_message?: string;
  }
) => {
  const { error } = await supabase
    .from('product_migrations')
    .update({
      ...updates,
      completed_at: updates.status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', migrationId);

  if (error) {
    console.error('Error updating migration record:', error);
    throw new Error(`Failed to update migration record: ${error.message || 'Database error'}`);
  }
};
