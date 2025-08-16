import { supabase } from '@/integrations/supabase/client';

export interface InventoryTransaction {
  productId: string;
  variantId?: string;
  quantity: number;
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'stock_transfer_out' | 'stock_transfer_in';
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

        const newQuantity = transaction.type === 'purchase' || transaction.type === 'return' || transaction.type === 'stock_transfer_in'
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

        const newQuantity = transaction.type === 'purchase' || transaction.type === 'return' || transaction.type === 'stock_transfer_in'
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

        // If there are any transactions, use calculated stock
        // Otherwise, use the database stock as initial/baseline stock
        const hasTransactions = totalReceived > 0 || totalSold > 0 || totalReturned > 0;
        const calculatedStock = hasTransactions 
          ? totalReceived + totalReturned - totalSold
          : product.stock_quantity || 0;

        console.log(`Product: ${product.name} (${product.sku})`);
        console.log(`  Database stock: ${product.stock_quantity}`);
        console.log(`  Received: ${totalReceived}, Sold: ${totalSold}, Returned: ${totalReturned}`);
        console.log(`  Has transactions: ${hasTransactions}`);
        console.log(`  Final stock: ${calculatedStock}`);

        return {
          ...product,
          calculated_stock: calculatedStock,
          database_stock: product.stock_quantity,
          has_transactions: hasTransactions,
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

    // Calculate actual stock based on transactions for each product (same as getInventoryLevels)
    for (const product of products || []) {
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

      // Use same logic as getInventoryLevels - preserve database stock if no transactions
      const hasTransactions = totalReceived > 0 || totalSold > 0 || totalReturned > 0;
      const calculatedStock = hasTransactions 
        ? totalReceived + totalReturned - totalSold
        : product.stock_quantity || 0;

      // Check main product stock using calculated values
      if (calculatedStock <= (product.min_stock_level || 0) && (product.min_stock_level || 0) > 0) {
        lowStockItems.push({
          type: 'product',
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: calculatedStock,
          minLevel: product.min_stock_level || 0
        });
      }

      // Check variant stock - for now, variants will use the same calculated stock logic
      // In a more advanced system, variants would have their own transaction tracking
      for (const variant of product.product_variants || []) {
        // Assuming variants inherit min stock level from parent product
        if (variant.stock_quantity <= (product.min_stock_level || 0) && (product.min_stock_level || 0) > 0) {
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

// Recalculate and fix all inventory levels for a tenant
export const recalculateInventoryLevels = async (tenantId: string) => {
  try {
    console.log('Starting inventory recalculation for tenant:', tenantId);
    
    // Get all active products for the tenant
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, stock_quantity, created_at')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) throw error;

    const results = [];

    for (const product of products || []) {
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

      // Calculate stock based on transactions
      const transactionBasedStock = totalReceived + totalReturned - totalSold;
      
      // For products with no transactions, preserve their current stock (likely from migration)
      // Only recalculate if there are actual transactions
      const hasTransactions = totalReceived > 0 || totalSold > 0 || totalReturned > 0;
      const calculatedStock = hasTransactions ? transactionBasedStock : (product.stock_quantity || 0);

      // Update the product stock_quantity in the database only if it's different
      const needsUpdate = calculatedStock !== (product.stock_quantity || 0);
      
      
      let updateError = null;
      if (needsUpdate) {
        const result = await supabase
          .from('products')
          .update({ stock_quantity: Math.max(0, calculatedStock) })
          .eq('id', product.id);
        
        updateError = result.error;

        if (updateError) {
          console.error(`Error updating stock for product ${product.name}:`, updateError);
        } else {
          console.log(`Updated ${product.name}: ${calculatedStock} units (${hasTransactions ? 'calculated' : 'preserved'})`);
        }
      } else {
        console.log(`${product.name}: Stock unchanged at ${calculatedStock} units`);
      }

      results.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        totalReceived,
        totalSold,
        totalReturned,
        calculatedStock,
        success: !updateError
      });
    }

    console.log('Inventory recalculation completed:', results.length, 'products processed');
    return results;
  } catch (error) {
    console.error('Error recalculating inventory levels:', error);
    throw error;
  }
};

// Process stock adjustment and update inventory
export const processStockAdjustment = async (
  tenantId: string,
  adjustmentId: string,
  adjustmentItems: Array<{
    productId: string;
    variantId?: string;
    adjustmentQuantity: number; // positive for increase, negative for decrease
    reason: string;
  }>
) => {
  try {
    const inventoryTransactions: InventoryTransaction[] = adjustmentItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.abs(item.adjustmentQuantity),
      type: item.adjustmentQuantity > 0 ? 'purchase' : 'sale', // treat as purchase/sale for inventory calculation
      referenceId: adjustmentId,
      referenceType: 'stock_adjustment',
      notes: `Stock adjustment: ${item.reason}`
    }));

    await updateProductInventory(tenantId, inventoryTransactions);
    console.log('Stock adjustment processed and inventory updated');
  } catch (error) {
    console.error('Error processing stock adjustment:', error);
    throw error;
  }
};

// Process stock transfer completion
export const processStockTransfer = async (
  tenantId: string,
  transferId: string,
  transferItems: Array<{
    productId: string;
    variantId?: string;
    quantityTransferred: number;
  }>,
  fromLocationId: string,
  toLocationId: string
) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Create inventory transactions for both source and destination
    const inventoryTransactions: InventoryTransaction[] = [];
    
    // Reduce stock at source location (negative quantity)
    transferItems.forEach(item => {
      inventoryTransactions.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: -item.quantityTransferred, // Negative for source location
        type: 'stock_transfer_out' as const,
        referenceId: transferId,
        referenceType: 'stock_transfer',
        notes: `Stock transferred out to location ${toLocationId}`
      });
    });
    
    // Increase stock at destination location (positive quantity)
    transferItems.forEach(item => {
      inventoryTransactions.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantityTransferred, // Positive for destination location
        type: 'stock_transfer_in' as const,
        referenceId: transferId,
        referenceType: 'stock_transfer',
        notes: `Stock transferred in from location ${fromLocationId}`
      });
    });

    // Apply inventory updates
    await updateProductInventory(tenantId, inventoryTransactions);
    
    console.log('Stock transfer inventory levels updated for both locations');
  } catch (error) {
    console.error('Error processing stock transfer:', error);
    throw error;
  }
};

// Initialize stock taking session with current inventory levels
export const initializeStockTakingSession = async (
  tenantId: string,
  sessionId: string,
  locationId?: string
) => {
  try {
    // Get all active products for the tenant
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        stock_quantity,
        cost_price,
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

    if (error) throw error;

    const stockTakingItems = [];

    // Create stock taking items for main products
    for (const product of products || []) {
      stockTakingItems.push({
        session_id: sessionId,
        product_id: product.id,
        system_quantity: product.stock_quantity || 0,
        unit_cost: product.cost_price || 0
      });

      // Create items for variants if they exist
      for (const variant of product.product_variants || []) {
        stockTakingItems.push({
          session_id: sessionId,
          product_id: product.id,
          variant_id: variant.id,
          system_quantity: variant.stock_quantity || 0,
          unit_cost: product.cost_price || 0
        });
      }
    }

    // Insert all stock taking items
    const { error: insertError } = await supabase
      .from('stock_taking_items')
      .insert(stockTakingItems);

    if (insertError) throw insertError;

    // Update session totals
    const { error: updateError } = await supabase
      .from('stock_taking_sessions')
      .update({
        total_products: stockTakingItems.length
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    console.log('Stock taking session initialized with', stockTakingItems.length, 'items');
    return stockTakingItems.length;
  } catch (error) {
    console.error('Error initializing stock taking session:', error);
    throw error;
  }
};

// Complete stock taking and create adjustments for variances
export const completeStockTaking = async (
  tenantId: string,
  sessionId: string,
  userId: string
) => {
  try {
    // Get all stock taking items with variances
    const { data: stockItems, error } = await supabase
      .from('stock_taking_items')
      .select(`
        *,
        products!inner(name, sku),
        product_variants(name, value, sku)
      `)
      .eq('session_id', sessionId)
      .neq('variance_quantity', 0);

    if (error) throw error;

    if (stockItems && stockItems.length > 0) {
      // Create a stock adjustment for the variances
      const adjustmentNumber = `ADJ-ST-${Date.now()}`;
      
      const { data: adjustment, error: adjError } = await supabase
        .from('stock_adjustments')
        .insert({
          tenant_id: tenantId,
          adjustment_number: adjustmentNumber,
          adjustment_type: 'correction',
          reason: `Stock taking variance correction - Session ${sessionId}`,
          status: 'approved',
          created_by: userId,
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .select()
        .single();

      if (adjError) throw adjError;

      // Create adjustment items for each variance
      const adjustmentItems = stockItems.map(item => ({
        adjustment_id: adjustment.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        system_quantity: item.system_quantity,
        physical_quantity: item.counted_quantity || 0,
        adjustment_quantity: item.variance_quantity,
        unit_cost: item.unit_cost,
        total_cost: (item.variance_quantity || 0) * (item.unit_cost || 0),
        reason: 'Stock taking variance'
      }));

      const { error: itemsError } = await supabase
        .from('stock_adjustment_items')
        .insert(adjustmentItems);

      if (itemsError) throw itemsError;

      // Process the adjustment to update inventory
      await processStockAdjustment(
        tenantId,
        adjustment.id,
        stockItems.map(item => ({
          productId: item.product_id,
          variantId: item.variant_id,
          adjustmentQuantity: item.variance_quantity || 0,
          reason: 'Stock taking variance'
        }))
      );
    }

    // Mark session as completed
    const { error: sessionError } = await supabase
      .from('stock_taking_sessions')
      .update({
        status: 'completed',
        completed_by: userId,
        completed_at: new Date().toISOString(),
        discrepancies_found: stockItems?.length || 0
      })
      .eq('id', sessionId);

    if (sessionError) throw sessionError;

    console.log('Stock taking completed with', stockItems?.length || 0, 'variances');
    return stockItems?.length || 0;
  } catch (error) {
    console.error('Error completing stock taking:', error);
    throw error;
  }
};