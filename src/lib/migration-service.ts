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
  details?: {
    imported: Array<{ name: string; status: 'success' | 'failed'; error?: string }>;
    duplicates: Array<{ name: string; reason: string }>;
    skipped: Array<{ name: string; reason: string }>;
  };
}

export interface BulkUpdateResult {
  success: number;
  failed: number;
  errors: string[];
  migrationId?: string;
  details?: {
    updated: Array<{ name: string; status: 'success' | 'failed'; error?: string; changes?: string[] }>;
    notFound: Array<{ name: string; reason: string }>;
    skipped: Array<{ name: string; reason: string }>;
  };
}

export interface ImportPreview {
  headers: string[];
  rows: string[][];
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
  async importProducts(file: File, onProgress?: (progress: number) => void): Promise<MigrationResult> {
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
    const details = {
      imported: [] as Array<{ name: string; status: 'success' | 'failed'; error?: string }>,
      duplicates: [] as Array<{ name: string; reason: string }>,
      skipped: [] as Array<{ name: string; reason: string }>
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Update progress
      const progress = Math.round(((i + 1) / rows.length) * 100);
      onProgress?.(progress);
      
      try {
        // Validate required fields
        if (!row.name || !row.name.trim()) {
          details.skipped.push({ name: row.name || 'unnamed', reason: 'Product name is required' });
          continue;
        }
        
        if (!row.price || isNaN(parseFloat(row.price))) {
          details.skipped.push({ name: row.name, reason: 'Valid price is required' });
          continue;
        }

        // Enhanced duplicate checking
        const duplicateErrors = await checkProductDuplicates(row, this.tenantId);
        if (duplicateErrors.length > 0) {
          details.duplicates.push({ 
            name: row.name, 
            reason: duplicateErrors.join(', ') 
          });
          continue; // Skip duplicates instead of failing
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
        details.imported.push({ name: row.name, status: 'success' });
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
        details.imported.push({ name: row.name, status: 'failed', error: errorMessage });
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
      migrationId: migrationRecord.id,
      details
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

  // Generate migration report
  generateMigrationReport(result: MigrationResult, fileName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `migration-report-${fileName}-${timestamp}.csv`;
    
    let csvContent = 'Product Name,Status,Details\n';
    
    // Add successful imports
    if (result.details?.imported) {
      result.details.imported.forEach(item => {
        csvContent += `"${item.name}","${item.status}","${item.error || 'Successfully imported'}"\n`;
      });
    }
    
    // Add duplicates
    if (result.details?.duplicates) {
      result.details.duplicates.forEach(item => {
        csvContent += `"${item.name}","Skipped (Duplicate)","${item.reason}"\n`;
      });
    }
    
    // Add skipped items
    if (result.details?.skipped) {
      result.details.skipped.forEach(item => {
        csvContent += `"${item.name}","Skipped","${item.reason}"\n`;
      });
    }
    
    return csvContent;
  }

  // Download migration report
  downloadMigrationReport(result: MigrationResult, originalFileName: string) {
    const csvContent = this.generateMigrationReport(result, originalFileName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `migration-report-${originalFileName}-${timestamp}.csv`;
    this.downloadCSV(csvContent, fileName);
  }

  // Generate bulk update template with all product details
  async generateBulkUpdateTemplate(): Promise<{ csvContent: string; fileName: string }> {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories(name),
        product_units(name, abbreviation),
        store_locations(name),
        accounts!revenue_account_id(name)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true);

    if (error) throw error;

    const headers = [
      'id',
      'name',
      'description',
      'sku',
      'barcode',
      'cost_price',
      'price',
      'wholesale_price',
      'stock_quantity',
      'min_stock_level',
      'category',
      'unit',
      'location',
      'revenue_account',
      'is_active'
    ];
    
    const csvContent = [
      headers.join(','),
      ...(products || []).map(product => [
        product.id,
        `"${product.name}"`,
        `"${product.description || ''}"`,
        `"${product.sku || ''}"`,
        `"${product.barcode || ''}"`,
        product.cost_price || 0,
        product.retail_price || product.price || 0,
        product.wholesale_price || 0,
        product.stock_quantity || 0,
        product.min_stock_level || 0,
        `"${product.product_categories?.name || ''}"`,
        `"${product.product_units?.name || ''}"`,
        `"${product.store_locations?.name || ''}"`,
        `"${product.accounts?.name || ''}"`,
        product.is_active ? 'true' : 'false'
      ].join(','))
    ].join('\n');

    const fileName = `products_bulk_update_template_${new Date().toISOString().split('T')[0]}.csv`;

    return { csvContent, fileName };
  }

  // Bulk update products
  async bulkUpdateProducts(file: File, onProgress?: (progress: number) => void): Promise<BulkUpdateResult> {
    const text = await file.text();
    const { data: rows } = processCSVData(text);
    
    // Create migration record
    const migrationRecord = await createMigrationRecord(
      this.tenantId,
      'bulk_update',
      file.name,
      rows.length
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const details = {
      updated: [] as Array<{ name: string; status: 'success' | 'failed'; error?: string; changes?: string[] }>,
      notFound: [] as Array<{ name: string; reason: string }>,
      skipped: [] as Array<{ name: string; reason: string }>
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Update progress
      const progress = Math.round(((i + 1) / rows.length) * 100);
      onProgress?.(progress);
      
      try {
        // Validate required fields
        if (!row.id || !row.id.trim()) {
          details.skipped.push({ name: row.name || 'unnamed', reason: 'Product ID is required for updates' });
          continue;
        }

        // Check if product exists
        const { data: existingProduct, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', row.id)
          .eq('tenant_id', this.tenantId)
          .single();

        if (fetchError || !existingProduct) {
          details.notFound.push({ 
            name: row.name || 'unnamed', 
            reason: `Product with ID ${row.id} not found` 
          });
          continue;
        }

        // Prepare update data
        const updateData: Record<string, string | number | boolean | null> = {};
        const changes: string[] = [];

        // Update basic fields
        if (row.name && row.name.trim() !== existingProduct.name) {
          updateData.name = row.name.trim();
          changes.push('name');
        }

        if (row.description !== undefined && row.description !== existingProduct.description) {
          updateData.description = row.description;
          changes.push('description');
        }

        if (row.sku && row.sku.trim() !== existingProduct.sku) {
          updateData.sku = row.sku.trim();
          changes.push('sku');
        }

        if (row.barcode !== undefined && row.barcode !== existingProduct.barcode) {
          updateData.barcode = row.barcode || null;
          changes.push('barcode');
        }

        // Update prices
        if (row.cost_price !== undefined && parseFloat(row.cost_price) !== existingProduct.cost_price) {
          updateData.cost_price = parseFloat(row.cost_price) || 0;
          changes.push('cost_price');
        }

        if (row.price !== undefined && parseFloat(row.price) !== existingProduct.price) {
          updateData.price = parseFloat(row.price) || 0;
          changes.push('price');
        }

        if (row.wholesale_price !== undefined && parseFloat(row.wholesale_price) !== existingProduct.wholesale_price) {
          updateData.wholesale_price = parseFloat(row.wholesale_price) || 0;
          changes.push('wholesale_price');
        }

        // Update stock
        if (row.stock_quantity !== undefined && parseInt(row.stock_quantity) !== existingProduct.stock_quantity) {
          updateData.stock_quantity = parseInt(row.stock_quantity) || 0;
          changes.push('stock_quantity');
        }

        if (row.min_stock_level !== undefined && parseInt(row.min_stock_level) !== existingProduct.min_stock_level) {
          updateData.min_stock_level = parseInt(row.min_stock_level) || 0;
          changes.push('min_stock_level');
        }

        // Update related entities
        if (row.category && row.category.trim()) {
          const categoryId = await findEntityId(row.category, 'categories', this.tenantId);
          if (categoryId && categoryId !== existingProduct.category_id) {
            updateData.category_id = categoryId;
            changes.push('category');
          }
        }

        if (row.unit && row.unit.trim()) {
          const unitId = await findEntityId(row.unit, 'units', this.tenantId);
          if (unitId && unitId !== existingProduct.unit_id) {
            updateData.unit_id = unitId;
            changes.push('unit');
          }
        }

        if (row.location && row.location.trim()) {
          const locationId = await findEntityId(row.location, 'locations', this.tenantId);
          if (locationId && locationId !== existingProduct.location_id) {
            updateData.location_id = locationId;
            changes.push('location');
          }
        }

        if (row.revenue_account && row.revenue_account.trim()) {
          const { data: account } = await supabase
            .from('accounts')
            .select('id')
            .eq('tenant_id', this.tenantId)
            .eq('is_active', true)
            .eq('name', row.revenue_account.trim())
            .single();
          
          if (account && account.id !== existingProduct.revenue_account_id) {
            updateData.revenue_account_id = account.id;
            changes.push('revenue_account');
          }
        }

        // Update active status
        if (row.is_active !== undefined) {
          const isActive = row.is_active.toLowerCase() === 'true';
          if (isActive !== existingProduct.is_active) {
            updateData.is_active = isActive;
            changes.push('is_active');
          }
        }

        // Only update if there are changes
        if (Object.keys(updateData).length === 0) {
          details.skipped.push({ 
            name: existingProduct.name, 
            reason: 'No changes detected' 
          });
          continue;
        }

        // Update the product
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', row.id);

        if (updateError) {
          throw new Error(`Database error: ${updateError.message}`);
        }

        success++;
        details.updated.push({ 
          name: existingProduct.name, 
          status: 'success',
          changes 
        });

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
        
        errors.push(`Row ${i + 1} (${row.name || 'unnamed'}): ${errorMessage}`);
        details.updated.push({ 
          name: row.name || 'unnamed', 
          status: 'failed', 
          error: errorMessage 
        });
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
      migrationId: migrationRecord.id,
      details
    };
  }

  // Generate bulk update report
  generateBulkUpdateReport(result: BulkUpdateResult, fileName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `bulk-update-report-${fileName}-${timestamp}.csv`;
    
    let csvContent = 'Product Name,Status,Changes,Details\n';
    
    // Add successful updates
    if (result.details?.updated) {
      result.details.updated.forEach(item => {
        if (item.status === 'success') {
          csvContent += `"${item.name}","Updated","${item.changes?.join(', ') || 'No changes'}","Successfully updated"\n`;
        } else {
          csvContent += `"${item.name}","Failed","","${item.error || 'Update failed'}"\n`;
        }
      });
    }
    
    // Add not found items
    if (result.details?.notFound) {
      result.details.notFound.forEach(item => {
        csvContent += `"${item.name}","Not Found","","${item.reason}"\n`;
      });
    }
    
    // Add skipped items
    if (result.details?.skipped) {
      result.details.skipped.forEach(item => {
        csvContent += `"${item.name}","Skipped","","${item.reason}"\n`;
      });
    }
    
    return csvContent;
  }

  // Download bulk update report
  downloadBulkUpdateReport(result: BulkUpdateResult, originalFileName: string) {
    const csvContent = this.generateBulkUpdateReport(result, originalFileName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `bulk-update-report-${originalFileName}-${timestamp}.csv`;
    this.downloadCSV(csvContent, fileName);
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
