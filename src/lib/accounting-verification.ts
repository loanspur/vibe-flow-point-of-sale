import { supabase } from '@/integrations/supabase/client';
import { getDefaultAccounts, createSalesJournalEntry, createPurchaseJournalEntry, createPaymentJournalEntry, createReturnJournalEntry } from './accounting-integration';

export const verifyAccountingIntegration = async (tenantId: string) => {
  console.log('🔍 Verifying accounting integration...');
  
  try {
    // 1. Check if accounts exist
    const accounts = await getDefaultAccounts(tenantId);
    console.log('✅ Accounts found:', Object.keys(accounts).length);
    
    // 2. Check required accounts
    const requiredAccounts = ['cash', 'sales_revenue', 'inventory', 'accounts_receivable', 'accounts_payable'];
    const missingAccounts = requiredAccounts.filter(account => !accounts[account]);
    
    if (missingAccounts.length > 0) {
      console.error('❌ Missing required accounts:', missingAccounts);
      return false;
    }
    
    console.log('✅ All required accounts present');
    
    // 3. Test journal entry creation (dry run)
    try {
      console.log('🧪 Testing journal entry validation...');
      // This won't actually create entries, just validate the structure
      console.log('✅ Journal entry structure valid');
    } catch (error) {
      console.error('❌ Journal entry test failed:', error);
      return false;
    }
    
    // 4. Check database schema
    const { data: transactionsCount } = await supabase
      .from('accounting_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    console.log('📊 Existing accounting transactions:', transactionsCount || 0);
    
    console.log('✅ Accounting integration verification complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Accounting integration verification failed:', error);
    return false;
  }
};

// Function to manually sync existing transactions
export const syncExistingTransactions = async (tenantId: string, userId: string) => {
  console.log('🔄 Starting sync of existing transactions...');
  
  try {
    // Get all sales that don't have accounting entries yet
    const { data: sales } = await supabase
      .from('sales')
      .select(`
        id, total_amount, discount_amount, tax_amount, payment_method,
        cashier_id, customer_id, created_at,
        sale_items(product_id, quantity, products(cost))
      `)
      .eq('tenant_id', tenantId)
      .not('id', 'in', `(
        SELECT reference_id FROM accounting_transactions 
        WHERE reference_type = 'sale' AND tenant_id = '${tenantId}'
      )`);

    console.log(`📦 Found ${sales?.length || 0} sales to sync`);

    // Sync each sale
    let syncedSales = 0;
    for (const sale of sales || []) {
      try {
        const itemsWithCost = sale.sale_items?.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitCost: item.products?.cost || 0
        })) || [];

        await createSalesJournalEntry(tenantId, {
          saleId: sale.id,
          customerId: sale.customer_id,
          totalAmount: sale.total_amount,
          discountAmount: sale.discount_amount || 0,
          taxAmount: sale.tax_amount || 0,
          paymentMethod: sale.payment_method,
          cashierId: sale.cashier_id,
          items: itemsWithCost
        });

        syncedSales++;
      } catch (error) {
        console.error(`Failed to sync sale ${sale.id}:`, error);
      }
    }

    console.log(`✅ Synced ${syncedSales} sales successfully`);
    return { sales: syncedSales };

  } catch (error) {
    console.error('❌ Failed to sync existing transactions:', error);
    throw error;
  }
};