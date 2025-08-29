import { supabase } from '@/integrations/supabase/client';
import {
  MIGRATION_CONFIG,
  generateUniqueSKU,
  mapProductPrices,
  findEntityId,
  checkProductDuplicates,
  validateImportData,
  processCSVData,
  createMigrationRecord,
  updateMigrationRecord,
  getInventoryAccountId
} from './migration-utils';

export interface MigrationResult {
  success: number;
  failed: number;
  errors: string[];
  migrationId?: string;
}

export interface ImportPreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
  validation: {
    isValid: boolean;
    missing: string[];
    valid: number;
    total: number;
  };
}

export class MigrationService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Preview CSV data before import
  async previewCSV(file: File, entityType: 'products' | 'contacts' | 'categories'): Promise<ImportPreview> {
    const text = await file.text();
    const { headers, data } = processCSVData(text);
    
    const validation = validateImportData(headers, entityType);
    
    const rows = data.slice(0, 5).map(row => 
      MIGRATION_CONFIG.exportFields[entityType].map(field => row[field] || '')
    );

    return {
      headers: MIGRATION_CONFIG.exportFields[entityType],
      rows,
      totalRows: data.length,
      validation
    };
  }

  // Import products with latest logic
  async importProducts(file: File): Promise<MigrationResult> {
    const text = await file.text();
    const { data: rows } = processCSVData(text);
    
    // Create migration record
    const migrationRecord = await createMigrationRecord(
      this.tenantId,
      'import',
      file.name,
      rows.length
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Validate required fields
        if (!row.name || !row.name.trim()) {
          throw new Error('Product name is required');
        }
        
        if (!row.price || isNaN(parseFloat(row.price))) {
          throw new Error('Valid price is required');
        }

        // Check for duplicates
        const duplicateErrors = await checkProductDuplicates(row, this.tenantId);
        if (duplicateErrors.length > 0) {
          throw new Error(duplicateErrors.join(', '));
        }

        // Generate SKU if not provided
        let finalSKU = row.sku;
        if (!finalSKU || finalSKU.trim() === '') {
          finalSKU = await generateUniqueSKU(row.name, this.tenantId);
        }

        // Map prices
        const prices = mapProductPrices(row);

        // Find related entity IDs
        const categoryId = row.category ? await findEntityId(row.category, 'categories', this.tenantId) : null;
        const unitId = row.unit ? await findEntityId(row.unit, 'units', this.tenantId) : null;
        const locationId = row.location ? await findEntityId(row.location, 'locations', this.tenantId) : null;
        
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

        // Prepare product data
        const productData = {
          tenant_id: this.tenantId,
          name: row.name,
          description: row.description || '',
          sku: finalSKU,
          barcode: row.barcode || null,
          ...prices,
          stock_quantity: parseInt(row.stock_quantity) || 0,
          category_id: categoryId,
          unit_id: unitId,
          location_id: locationId,
          revenue_account_id: revenueAccountId, // Auto-map inventory account or specified account
          is_active: true
        };

        // Insert product
        const { data: insertedProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (insertError) {
          throw new Error(`Database error: ${insertError.message}`);
        }

        // Handle inventory integration if stock quantity > 0
        const stockQuantity = parseInt(row.stock_quantity) || 0;
        if (stockQuantity > 0 && insertedProduct?.id) {
          await this.createInventoryTransaction(insertedProduct.id, row.name, stockQuantity, prices.cost_price);
        }

        success++;
      } catch (error) {
        failed++;
        let errorMessage = 'Unknown error';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }
        
        // Log detailed error for debugging
        console.error(`Migration row ${i + 1} error:`, {
          row,
          error,
          errorMessage,
          rowName: row.name || 'unnamed'
        });
        
        errors.push(`Row ${i + 1} (${row.name || 'unnamed'}): ${errorMessage}`);
      }
    }

    // Update migration record
    await updateMigrationRecord(migrationRecord.id, {
      successful_records: success,
      failed_records: failed,
      status: failed === 0 ? 'completed' : failed < rows.length ? 'partial' : 'failed',
      error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined
    });

    return {
      success,
      failed,
      errors,
      migrationId: migrationRecord.id
    };
  }

  // Import contacts
  async importContacts(file: File): Promise<MigrationResult> {
    const text = await file.text();
    const { data: rows } = processCSVData(text);
    
    const migrationRecord = await createMigrationRecord(
      this.tenantId,
      'import',
      file.name,
      rows.length
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Validate required fields
        if (!row.name || !row.type) {
          throw new Error('Missing required fields: name and type');
        }

        // Check for duplicate contact names
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('name', row.name)
          .eq('tenant_id', this.tenantId)
          .maybeSingle();

        if (existingContact) {
          throw new Error(`Contact "${row.name}" already exists`);
        }

        // Insert contact
        const { error: insertError } = await supabase
          .from('contacts')
          .insert({
            tenant_id: this.tenantId,
            name: row.name,
            type: row.type,
            email: row.email || null,
            phone: row.phone || null,
            company: row.company || null,
            address: row.address || null,
            notes: row.notes || null,
          });

        if (insertError) {
          throw new Error(`Database error: ${insertError.message}`);
        }

        success++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${i + 1} (${row.name || 'unnamed'}): ${errorMessage}`);
      }
    }

    await updateMigrationRecord(migrationRecord.id, {
      successful_records: success,
      failed_records: failed,
      status: failed === 0 ? 'completed' : failed < rows.length ? 'partial' : 'failed',
      error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined
    });

    return {
      success,
      failed,
      errors,
      migrationId: migrationRecord.id
    };
  }

  // Import categories
  async importCategories(file: File): Promise<MigrationResult> {
    const text = await file.text();
    const { data: rows } = processCSVData(text);
    
    const migrationRecord = await createMigrationRecord(
      this.tenantId,
      'import',
      file.name,
      rows.length
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Validate required fields
        if (!row.name) {
          throw new Error('Missing required field: name');
        }

        // Check for duplicate categories
        const { data: existingCategories } = await supabase
          .from('product_categories')
          .select('name')
          .eq('tenant_id', this.tenantId);

        const categoryNames = (existingCategories || []).map(c => c.name.toLowerCase().trim());
        const newCategoryName = row.name.toLowerCase().trim();
        
        if (categoryNames.includes(newCategoryName)) {
          throw new Error(`Category "${row.name}" already exists`);
        }

        // Insert category
        const { error: insertError } = await supabase
          .from('product_categories')
          .insert({
            tenant_id: this.tenantId,
            name: row.name,
            description: row.description || null,
            color: row.color || null,
          });

        if (insertError) {
          throw new Error(`Database error: ${insertError.message}`);
        }

        success++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${i + 1} (${row.name || 'unnamed'}): ${errorMessage}`);
      }
    }

    await updateMigrationRecord(migrationRecord.id, {
      successful_records: success,
      failed_records: failed,
      status: failed === 0 ? 'completed' : failed < rows.length ? 'partial' : 'failed',
      error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined
    });

    return {
      success,
      failed,
      errors,
      migrationId: migrationRecord.id
    };
  }

  // Export products
  async exportProducts(): Promise<{ csvContent: string; fileName: string }> {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories(name),
        product_units(name),
        store_locations(name),
        accounts!revenue_account_id(name)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true);

    if (error) throw error;

    const headers = MIGRATION_CONFIG.exportFields.products;
    
    const csvContent = [
      headers.join(','),
      ...(products || []).map(product => [
        product.name,
        product.description || '',
        product.sku || '',
        product.cost_price || 0,
        product.retail_price || product.price || 0,
        product.wholesale_price || 0,
        product.stock_quantity || 0,
        product.product_categories?.name || '',
        product.product_units?.name || '',
        product.store_locations?.name || '',
        product.accounts?.name || ''
      ].join(','))
    ].join('\n');

    const fileName = `products_export_${new Date().toISOString().split('T')[0]}.csv`;

    return { csvContent, fileName };
  }

  // Export contacts
  async exportContacts(): Promise<{ csvContent: string; fileName: string }> {
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (error) throw error;

    const headers = MIGRATION_CONFIG.exportFields.contacts;
    
    const csvContent = [
      headers.join(','),
      ...(contacts || []).map(contact => [
        contact.name,
        contact.type,
        contact.email || '',
        contact.phone || '',
        contact.company || '',
        contact.address || '',
        contact.notes || ''
      ].join(','))
    ].join('\n');

    const fileName = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;

    return { csvContent, fileName };
  }

  // Export categories
  async exportCategories(): Promise<{ csvContent: string; fileName: string }> {
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true);

    if (error) throw error;

    const headers = MIGRATION_CONFIG.exportFields.categories;
    
    const csvContent = [
      headers.join(','),
      ...(categories || []).map(category => [
        category.name,
        category.description || '',
        category.color || ''
      ].join(','))
    ].join('\n');

    const fileName = `categories_export_${new Date().toISOString().split('T')[0]}.csv`;

    return { csvContent, fileName };
  }

  // Create inventory transaction for imported products
  private async createInventoryTransaction(
    productId: string, 
    productName: string, 
    quantity: number, 
    unitCost: number
  ) {
    try {
      // Only create inventory transaction if quantity > 0
      if (quantity <= 0) return;
      
      const { updateProductInventory } = await import('@/lib/inventory-integration');
      
      await updateProductInventory(this.tenantId, [{
        productId,
        quantity,
        type: 'purchase',
        referenceId: productId,
        referenceType: 'product_import',
        unitCost,
        notes: `Initial stock from product import: ${productName}`
      }]);
    } catch (error) {
      console.warn('Failed to create inventory transaction:', error);
      // Don't fail the import if inventory integration fails
    }
  }

  // Download CSV file
  downloadCSV(csvContent: string, fileName: string) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generate sample template
  generateTemplate(entityType: 'products' | 'contacts' | 'categories'): { csvContent: string; fileName: string } {
    const headers = MIGRATION_CONFIG.exportFields[entityType];
    const sampleData = this.getSampleData(entityType);
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        headers.map(header => row[header] || '').join(',')
      )
    ].join('\n');

    const fileName = `${entityType}_migration_template.csv`;

    return { csvContent, fileName };
  }

  private getSampleData(entityType: 'products' | 'contacts' | 'categories') {
    switch (entityType) {
             case 'products':
         return [
           {
             name: 'Sample Product 1',
             description: 'This is a sample product description',
             sku: '',
             cost_price: '50.00',
             price: '100.00',
             wholesale_price: '80.00',
             stock_quantity: '50',
             category: 'Electronics',
             unit: 'Pieces',
             location: 'Main Store',
             revenue_account: 'Inventory'
           },
           {
             name: 'Sample Product 2',
             description: 'Another sample product',
             sku: '',
             cost_price: '30.00',
             price: '75.50',
             wholesale_price: '60.00',
             stock_quantity: '25',
             category: 'Clothing',
             unit: 'Units',
             location: 'Warehouse',
             revenue_account: 'Inventory'
           }
         ];
      case 'contacts':
        return [
          {
            name: 'John Doe',
            type: 'customer',
            email: 'john@example.com',
            phone: '+1234567890',
            company: 'ABC Corp',
            address: '123 Main St',
            notes: 'VIP customer'
          },
          {
            name: 'Jane Smith',
            type: 'supplier',
            email: 'jane@supplier.com',
            phone: '+0987654321',
            company: 'XYZ Supplies',
            address: '456 Business Ave',
            notes: 'Preferred supplier'
          }
        ];
      case 'categories':
        return [
          {
            name: 'Electronics',
            description: 'Electronic devices and accessories',
            color: '#3B82F6'
          },
          {
            name: 'Clothing',
            description: 'Apparel and fashion items',
            color: '#EF4444'
          }
        ];
      default:
        return [];
    }
  }
}
