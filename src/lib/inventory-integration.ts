import { supabase } from '@/integrations/supabase/client';

export interface InventoryTransaction {
  productId: string;
  variantId?: string;
  quantity: number;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  referenceId?: string;
  referenceType?: string;
  unitCost?: number;
  notes?: string;
}

// Update product inventory levels
export const updateProductInventory = async (
  tenantId: string,
  transactions: InventoryTransaction[]
) => {
  try {
    for (const transaction of transactions) {
      if (transaction.variantId) {
        // Update variant inventory
        const { data: variant, error: getVariantError } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', transaction.variantId)
          .single();

        if (getVariantError) {
          console.error('Error fetching variant:', getVariantError);
          continue;
        }

        const newQuantity = transaction.type === 'purchase' || transaction.type === 'return'
          ? (variant.stock_quantity || 0) + transaction.quantity
          : (variant.stock_quantity || 0) - transaction.quantity;

        const { error: updateVariantError } = await supabase
          .from('product_variants')
          .update({ stock_quantity: Math.max(0, newQuantity) })
          .eq('id', transaction.variantId);

        if (updateVariantError) {
          console.error('Error updating variant inventory:', updateVariantError);
        }
      } else {
        // Update main product inventory
        const { data: product, error: getProductError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', transaction.productId)
          .single();

        if (getProductError) {
          console.error('Error fetching product:', getProductError);
          continue;
        }

        const newQuantity = transaction.type === 'purchase' || transaction.type === 'return'
          ? (product.stock_quantity || 0) + transaction.quantity
          : (product.stock_quantity || 0) - transaction.quantity;

        const { error: updateProductError } = await supabase
          .from('products')
          .update({ stock_quantity: Math.max(0, newQuantity) })
          .eq('id', transaction.productId);

        if (updateProductError) {
          console.error('Error updating product inventory:', updateProductError);
        }
      }
    }

    console.log('Inventory updated successfully for', transactions.length, 'transactions');
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
};

// Process purchase receipt and update inventory
export const processPurchaseReceipt = async (
  tenantId: string,
  purchaseId: string,
  receivedItems: Array<{
    productId: string;
    variantId?: string;
    quantityReceived: number;
    unitCost: number;
  }>
) => {
  try {
    const inventoryTransactions: InventoryTransaction[] = receivedItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantityReceived,
      type: 'purchase' as const,
      referenceId: purchaseId,
      referenceType: 'purchase_receipt',
      unitCost: item.unitCost,
      notes: `Purchase receipt for PO ${purchaseId}`
    }));

    await updateProductInventory(tenantId, inventoryTransactions);
    console.log('Purchase receipt processed and inventory updated');
  } catch (error) {
    console.error('Error processing purchase receipt:', error);
    throw error;
  }
};

// Process sale and update inventory
export const processSaleInventory = async (
  tenantId: string,
  saleId: string,
  saleItems: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>
) => {
  try {
    const inventoryTransactions: InventoryTransaction[] = saleItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      type: 'sale' as const,
      referenceId: saleId,
      referenceType: 'sale',
      notes: `Sale transaction ${saleId}`
    }));

    await updateProductInventory(tenantId, inventoryTransactions);
    console.log('Sale inventory processed and updated');
  } catch (error) {
    console.error('Error processing sale inventory:', error);
    throw error;
  }
};

// Process return and update inventory
export const processReturnInventory = async (
  tenantId: string,
  returnId: string,
  returnItems: Array<{
    productId: string;
    variantId?: string;
    quantityReturned: number;
    restock: boolean;
  }>
) => {
  try {
    const inventoryTransactions: InventoryTransaction[] = returnItems
      .filter(item => item.restock) // Only update inventory if item is being restocked
      .map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantityReturned,
        type: 'return' as const,
        referenceId: returnId,
        referenceType: 'return',
        notes: `Return restocked for return ${returnId}`
      }));

    if (inventoryTransactions.length > 0) {
      await updateProductInventory(tenantId, inventoryTransactions);
      console.log('Return inventory processed and updated');
    }
  } catch (error) {
    console.error('Error processing return inventory:', error);
    throw error;
  }
};

// Get current inventory levels
export const getInventoryLevels = async (tenantId: string, productId?: string) => {
  try {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        stock_quantity,
        min_stock_level,
        product_variants (
          id,
          name,
          value,
          sku,
          stock_quantity
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (productId) {
      query = query.eq('id', productId);
    }

    const { data: products, error } = await query.order('name');

    if (error) throw error;

    // Calculate actual stock based on transactions for each product
    const productsWithCalculatedStock = await Promise.all(
      (products || []).map(async (product) => {
        // Get purchase receipts (received items)
        const { data: purchaseItems } = await supabase
          .from('purchase_items')
          .select('quantity_received')
          .eq('product_id', product.id);

        // Get sales
        const { data: saleItems } = await supabase
          .from('sale_items')
          .select('quantity')
          .eq('product_id', product.id);

        // Get returns that were restocked
        const { data: returnItems } = await supabase
          .from('return_items')
          .select('quantity_returned')
          .eq('product_id', product.id)
          .eq('restock', true);

        const totalReceived = purchaseItems?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0;
        const totalSold = saleItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const totalReturned = returnItems?.reduce((sum, item) => sum + (item.quantity_returned || 0), 0) || 0;

        const calculatedStock = totalReceived + totalReturned - totalSold;

        return {
          ...product,
          calculated_stock: calculatedStock,
          database_stock: product.stock_quantity,
          // Use calculated stock for display
          stock_quantity: calculatedStock
        };
      })
    );

    return productsWithCalculatedStock;
  } catch (error) {
    console.error('Error fetching inventory levels:', error);
    throw error;
  }
};

// Check for low stock items
export const getLowStockItems = async (tenantId: string) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        stock_quantity,
        min_stock_level,
        product_variants (
          id,
          name,
          value,
          sku,
          stock_quantity
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const lowStockItems = [];

    for (const product of products || []) {
      // Check main product stock
      if (product.stock_quantity <= (product.min_stock_level || 0)) {
        lowStockItems.push({
          type: 'product',
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: product.stock_quantity,
          minLevel: product.min_stock_level || 0
        });
      }

      // Check variant stock
      for (const variant of product.product_variants || []) {
        // Assuming variants inherit min stock level from parent product
        if (variant.stock_quantity <= (product.min_stock_level || 0)) {
          lowStockItems.push({
            type: 'variant',
            id: variant.id,
            productId: product.id,
            name: `${product.name} - ${variant.name}: ${variant.value}`,
            sku: variant.sku,
            currentStock: variant.stock_quantity,
            minLevel: product.min_stock_level || 0
          });
        }
      }
    }

    return lowStockItems;
  } catch (error) {
    console.error('Error checking low stock items:', error);
    throw error;
  }
};