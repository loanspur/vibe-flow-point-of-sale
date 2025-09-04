import { supabase } from '@/integrations/supabase/client';
import { processSaleInventory } from './inventory-integration';
import { initializeDefaultChartOfAccounts } from './default-accounts';

// Utility function to round amounts to nearest whole number for accounting precision
const roundAmount = (amount: number): number => {
  return Math.round(amount);
};

// Enhanced payment method interface for accounting integration
interface PaymentMethodAccount {
  id: string;
  name: string;
  type: string;
  account_id?: string; // For existing payment_methods table compatibility
}

export interface AccountingEntry {
  account_id: string;
  debit_amount?: number;
  credit_amount?: number;
  description?: string;
}

export interface AccountingTransaction {
  description: string;
  reference_id?: string;
  reference_type?: string;
  transaction_date?: string;
  entries: AccountingEntry[];
}

// Get default accounts for common transaction types
export const getDefaultAccounts = async (tenantId: string) => {
  let { data: accounts, error } = await supabase
    .from('accounts')
    .select(`
      id,
      code,
      name,
      account_types!inner(category)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (error) throw error;

  // If no accounts exist, automatically initialize the default chart of accounts
  if (!accounts || accounts.length === 0) {
    console.log('No accounts found for tenant, initializing default chart of accounts...');
    try {
      await initializeDefaultChartOfAccounts(tenantId);
      
      // Retry fetching accounts after initialization
      const { data: newAccounts, error: retryError } = await supabase
        .from('accounts')
        .select(`
          id,
          code,
          name,
          account_types!inner(category)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (retryError) throw retryError;
      
      if (!newAccounts || newAccounts.length === 0) {
        throw new Error('Failed to initialize default chart of accounts');
      }
      
      console.log(`Successfully initialized ${newAccounts.length} accounts for tenant`);
      // Use the newly created accounts
      accounts = newAccounts;
    } catch (initError) {
      console.error('Error initializing chart of accounts:', initError);
      throw new Error('No accounts found and failed to initialize default chart of accounts. Please set up your chart of accounts manually.');
    }
  }

  console.log('Available accounts for tenant:', accounts.map(a => ({ name: a.name, code: a.code, id: a.id })));

  // Create a mapping based on account names and codes for flexibility
  const accountMap = accounts.reduce((map, account) => {
    // Map by name (lowercase, replace spaces/special chars with underscores)
    const nameKey = account.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    map[nameKey] = account.id;
    
    // Map by code for direct lookup
    map[`code_${account.code}`] = account.id;
    
    // Category-based mapping with debug logging
    const category = account.account_types.category;
    const name = account.name.toLowerCase();
    
    if (name.includes('cash')) {
      map.cash = account.id;
      console.log('✓ Mapped cash account:', account.name, account.id);
    }
    if (name.includes('receivable')) {
      map.accounts_receivable = account.id;
      console.log('✓ Mapped A/R account:', account.name, account.id);
    }
    if (name.includes('payable')) {
      map.accounts_payable = account.id;
      console.log('✓ Mapped A/P account:', account.name, account.id);
    }
    
    // Enhanced inventory mapping with debug logging
    if (name.includes('inventory') || name === 'inventory' || name.includes('stock') || 
        account.code === '1200' || account.code === '1020') {
      map.inventory = account.id;
      console.log('✓ Mapped inventory account:', account.name, account.code, account.id);
    }
    
    if (name.includes('sales') && category === 'income') {
      map.sales_revenue = account.id;
      console.log('✓ Mapped sales revenue:', account.name, account.id);
    }
    if (name.includes('shipping') && category === 'income') {
      map.shipping_revenue = account.id;
      console.log('✓ Mapped shipping revenue:', account.name, account.id);
    }
    if (name.includes('shipping') && category === 'expenses') {
      map.shipping_expense = account.id;
      console.log('✓ Mapped shipping expense:', account.name, account.id);
    }
    if (name.includes('cost') || name.includes('cogs') || (name.includes('goods') && name.includes('sold'))) {
      map.cost_of_goods_sold = account.id;
      console.log('✓ Mapped COGS:', account.name, account.id);
    }
    if (account.name.toLowerCase().includes('tax') && account.name.toLowerCase().includes('payable')) {
      map.sales_tax_payable = account.id;
    }
    if (account.name.toLowerCase().includes('discount')) {
      map.discount_given = account.id;
    }
    
    return map;
  }, {} as Record<string, string>);

  console.log('Account mapping created:', accountMap);
  return accountMap;
};

// Create a journal entry
export const createJournalEntry = async (
  tenantId: string,
  transaction: AccountingTransaction,
  createdBy: string
) => {
  try {
    // Validate double-entry bookkeeping with proper rounding for fractional quantities
    const totalDebits = transaction.entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = transaction.entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
    
    // Round to nearest whole number to handle fractional quantities
    const roundedDebits = roundAmount(totalDebits);
    const roundedCredits = roundAmount(totalCredits);
    
    if (Math.abs(roundedDebits - roundedCredits) > 0) {
      console.error('Accounting balance check failed:', {
        totalDebits,
        totalCredits,
        roundedDebits,
        roundedCredits,
        difference: Math.abs(roundedDebits - roundedCredits),
        entries: transaction.entries
      });
      throw new Error(`Journal entry must balance: debits (${roundedDebits}) must equal credits (${roundedCredits})`);
    }

    // Generate transaction number
    const transactionNumber = `JE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create accounting transaction
    const { data: accountingTransaction, error: transactionError } = await supabase
      .from('accounting_transactions')
      .insert({
        transaction_number: transactionNumber,
        description: transaction.description,
        reference_id: transaction.reference_id,
        reference_type: transaction.reference_type,
        transaction_date: transaction.transaction_date || new Date().toISOString().split('T')[0],
        total_amount: totalDebits,
        created_by: createdBy,
        tenant_id: tenantId,
        is_posted: true
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Create accounting entries
    const entries = transaction.entries.map(entry => ({
      transaction_id: accountingTransaction.id,
      account_id: entry.account_id,
      debit_amount: entry.debit_amount || 0,
      credit_amount: entry.credit_amount || 0,
      description: entry.description
    }));

    const { error: entriesError } = await supabase
      .from('accounting_entries')
      .insert(entries);

    if (entriesError) throw entriesError;

    return accountingTransaction;
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }
};

// Get payment method asset account mapping
export const getPaymentMethodAccount = async (
  tenantId: string, 
  paymentMethodType: string
): Promise<string> => {
  try {
    // Since the existing payment_methods table doesn't have account_id,
    // we'll use the default account mapping based on payment type
    const accounts = await getDefaultAccounts(tenantId);
    
    switch (paymentMethodType) {
      case 'cash':
        if (!accounts.cash) throw new Error('Cash account not found');
        return accounts.cash;
        
      case 'card':
      case 'digital':
      case 'bank_transfer':
        // Try to find a bank/card account, fallback to cash
        return accounts.bank || accounts.cash;
        
      case 'credit':
        if (!accounts.accounts_receivable) throw new Error('Accounts Receivable account not found');
        return accounts.accounts_receivable;
        
      default:
        // Default to cash account for unknown payment types
        if (!accounts.cash) throw new Error('Cash account not found');
        return accounts.cash;
    }
  } catch (error) {
    console.error('Error getting payment method account:', error);
    throw error;
  }
};

// Enhanced sales transaction accounting integration with proper payment method accounting
export const createEnhancedSalesJournalEntry = async (
  tenantId: string,
  saleData: {
    saleId: string;
    customerId?: string;
    totalAmount: number;
    discountAmount: number;
    taxAmount: number;
    shippingAmount?: number;
    payments: Array<{ method: string; amount: number }>;
    cashierId: string;
    items?: Array<{ productId: string; variantId?: string; quantity: number; unitCost?: number }>;
  }
) => {
  try {
    // Fetch customer name for better transaction description
    let customerName = 'Walk-in Customer';
    if (saleData.customerId) {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('contacts')
          .select('name, company')
          .eq('id', saleData.customerId)
          .eq('tenant_id', tenantId)
          .single();
        
        if (!customerError && customerData) {
          customerName = customerData.company || customerData.name;
        }
      } catch (error) {
        console.warn('Could not fetch customer name:', error);
      }
    }
    
    const accounts = await getDefaultAccounts(tenantId);
    const { totalAmount, discountAmount, taxAmount, payments } = saleData;
    
    console.log('🔍 ACCOUNTING DEBUG: Processing payments:', payments);
    
    // Correct calculation: totalAmount already includes tax and excludes discount
    // So subtotal before tax = totalAmount - taxAmount + discountAmount  
    // But for sales revenue, we want the amount before tax and discount
    const subtotalBeforeTaxAndDiscount = totalAmount - taxAmount + discountAmount;
    const entries: AccountingEntry[] = [];
    
    // Handle each payment method with its specific asset account
    let totalCreditAmount = 0;
    
    for (const payment of payments) {
      const accountId = await getPaymentMethodAccount(tenantId, payment.method);
      
      if (payment.method === 'credit') {
        totalCreditAmount += payment.amount;
      }
      
      // Debit the appropriate asset account for this payment method
      const debitEntry = {
        account_id: accountId,
        debit_amount: roundAmount(payment.amount),
        description: `Payment via ${payment.method}`
      };
      entries.push(debitEntry);
    }

    // Credit: Sales Revenue (adjusted for shipping - shipping is separate income)
    if (!accounts.sales_revenue) throw new Error('Sales Revenue account not found');
    const salesRevenue = subtotalBeforeTaxAndDiscount - (saleData.shippingAmount || 0);
    if (salesRevenue > 0) {
      entries.push({
        account_id: accounts.sales_revenue,
        credit_amount: roundAmount(salesRevenue),
        description: 'Sales revenue'
      });
    }

    // Credit: Shipping Revenue (if shipping charges exist)
    if (saleData.shippingAmount && saleData.shippingAmount > 0) {
      // Try to find shipping revenue account, fallback to sales revenue
      const shippingAccount = accounts.shipping_revenue || accounts.sales_revenue;
      entries.push({
        account_id: shippingAccount,
        credit_amount: roundAmount(saleData.shippingAmount),
        description: 'Shipping charges'
      });
    }

    // Credit: Sales Tax Payable (if applicable)
    if (taxAmount > 0 && accounts.sales_tax_payable) {
      entries.push({
        account_id: accounts.sales_tax_payable,
        credit_amount: roundAmount(taxAmount),
        description: 'Sales tax collected'
      });
    }

    // Debit: Discount Given (if applicable)
    if (discountAmount > 0 && accounts.discount_given) {
      entries.push({
        account_id: accounts.discount_given,
        debit_amount: roundAmount(discountAmount),
        description: 'Discount given to customer'
      });
    }

    // Cost of Goods Sold and Inventory adjustment
    if (saleData.items && saleData.items.length > 0 && accounts.cost_of_goods_sold && accounts.inventory) {
      const totalCOGS = saleData.items.reduce((sum, item) => {
        // Round to nearest whole number to handle fractional quantity precision issues
        const itemCOGS = (item.unitCost || 0) * item.quantity;
        return sum + roundAmount(itemCOGS);
      }, 0);

      if (totalCOGS > 0) {
        // Debit: Cost of Goods Sold
        entries.push({
          account_id: accounts.cost_of_goods_sold,
          debit_amount: roundAmount(totalCOGS),
          description: 'Cost of goods sold'
        });

        // Credit: Inventory
        entries.push({
          account_id: accounts.inventory,
          credit_amount: roundAmount(totalCOGS),
          description: 'Inventory reduction from sale'
        });
      }
    }

    const transaction: AccountingTransaction = {
      description: `Sale to ${customerName}${totalCreditAmount > 0 ? ' (Credit Sale)' : ''}`,
      reference_id: saleData.saleId,
      reference_type: 'sale',
      entries
    };

    // Create the journal entry first
    const result = await createJournalEntry(tenantId, transaction, saleData.cashierId);

    // Create AR record for credit payments only
    if (saleData.customerId && totalCreditAmount > 0) {
      try {
        await supabase.rpc('create_accounts_receivable_record', {
          tenant_id_param: tenantId,
          sale_id_param: saleData.saleId,
          customer_id_param: saleData.customerId,
          total_amount_param: totalCreditAmount
        });
        console.log('AR record created for credit amount:', totalCreditAmount);
      } catch (arError) {
        console.error('Error creating AR record:', arError);
      }
    }

    // Update inventory for sale items
    if (saleData.items && saleData.items.length > 0) {
      try {
        await processSaleInventory(tenantId, saleData.saleId, saleData.items);
      } catch (inventoryError) {
        console.error('Error updating inventory for sale:', inventoryError);
        // Don't fail the transaction if inventory update fails, but log it
      }
    }

    return result;
  } catch (error) {
    console.error('Error creating enhanced sales journal entry:', error);
    throw error;
  }
};

// Enhanced purchase transaction accounting integration with proper payment method accounting
export const createEnhancedPurchaseJournalEntry = async (
  tenantId: string,
  purchaseData: {
    purchaseId: string;
    supplierId: string;
    totalAmount: number;
    shippingAmount?: number;
    isReceived: boolean;
    payments?: Array<{ method: string; amount: number }>;
    createdBy: string;
    items?: Array<{ productId: string; variantId?: string; quantity: number; unitCost: number }>;
  }
) => {
  try {
    // Fetch supplier name for better transaction description
    let supplierName = 'Unknown Supplier';
    try {
      const { data: supplierData, error: supplierError } = await supabase
        .from('contacts')
        .select('name, company')
        .eq('id', purchaseData.supplierId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (!supplierError && supplierData) {
        supplierName = supplierData.company || supplierData.name;
      }
    } catch (error) {
      console.warn('Could not fetch supplier name:', error);
    }
    
    const accounts = await getDefaultAccounts(tenantId);
    const { totalAmount, shippingAmount = 0, isReceived, payments = [] } = purchaseData;
    const entries: AccountingEntry[] = [];
    
    if (isReceived) {
      const inventoryAmount = totalAmount - shippingAmount;
      
      // Debit: Inventory (for received goods, excluding shipping)
      if (inventoryAmount > 0) {
        if (!accounts.inventory) throw new Error('Inventory account not found');
        entries.push({
          account_id: accounts.inventory,
          debit_amount: inventoryAmount,
          description: 'Inventory received from purchase'
        });
      }

      // Debit: Shipping Expense (if shipping charges exist)
      if (shippingAmount > 0) {
        // Try to find shipping expense account, fallback to general expense
        const shippingExpenseAccount = accounts.shipping_expense || accounts.cost_of_goods_sold;
        if (shippingExpenseAccount) {
          entries.push({
            account_id: shippingExpenseAccount,
            debit_amount: shippingAmount,
            description: 'Shipping charges on purchase'
          });
        }
      }

      // Handle payments if provided
      if (payments && payments.length > 0) {
        // Process each payment method with its specific asset account
        for (const payment of payments) {
          const accountId = await getPaymentMethodAccount(tenantId, payment.method);
          
          // Credit the appropriate asset account for this payment method
          entries.push({
            account_id: accountId,
            credit_amount: payment.amount,
            description: `Payment via ${payment.method}`
          });
        }
        
        // Check if there's remaining unpaid amount
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const unpaidAmount = totalAmount - totalPaid;
        
        if (unpaidAmount > 0) {
          // Credit: Accounts Payable (for unpaid portion)
          if (!accounts.accounts_payable) throw new Error('Accounts Payable account not found');
          entries.push({
            account_id: accounts.accounts_payable,
            credit_amount: unpaidAmount,
            description: 'Amount owed to supplier'
          });
        }
      } else {
        // No payments provided - full amount goes to accounts payable
        if (!accounts.accounts_payable) throw new Error('Accounts Payable account not found');
        entries.push({
          account_id: accounts.accounts_payable,
          credit_amount: totalAmount,
          description: 'Amount owed to supplier'
        });
      }
    } else {
      // Purchase order created but not received yet - no inventory entry
      // Only create entries if payments were made upfront
      if (payments && payments.length > 0) {
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Debit: Prepaid Expenses or Advances to Suppliers
        // Use accounts payable account with negative amount to represent prepayment
        if (!accounts.accounts_payable) throw new Error('Accounts Payable account not found');
        entries.push({
          account_id: accounts.accounts_payable,
          debit_amount: totalPaid,
          description: 'Advance payment to supplier'
        });

        // Process each payment method
        for (const payment of payments) {
          const accountId = await getPaymentMethodAccount(tenantId, payment.method);
          
          // Credit the appropriate asset account for this payment method
          entries.push({
            account_id: accountId,
            credit_amount: payment.amount,
            description: `Advance payment via ${payment.method}`
          });
        }
      }
    }

    const transaction: AccountingTransaction = {
      description: `Purchase from ${supplierName}${isReceived ? ' (Received)' : ' (Ordered)'}`,
      reference_id: purchaseData.purchaseId,
      reference_type: 'purchase',
      entries
    };

    // Create the journal entry first
    const result = await createJournalEntry(tenantId, transaction, purchaseData.createdBy);

    // Create AP record only if there's an unpaid balance
    if (isReceived && payments) {
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const unpaidAmount = totalAmount - totalPaid;
      
      if (unpaidAmount > 0) {
        try {
          await supabase.rpc('create_accounts_payable_record', {
            tenant_id_param: tenantId,
            purchase_id_param: purchaseData.purchaseId,
            supplier_id_param: purchaseData.supplierId,
            total_amount_param: unpaidAmount
          });
          console.log('AP record created for unpaid amount:', unpaidAmount);
        } catch (apError) {
          console.error('Error creating AP record:', apError);
        }
      }
    } else if (isReceived && !payments) {
      // Full amount goes to AP if no payments provided
      try {
        await supabase.rpc('create_accounts_payable_record', {
          tenant_id_param: tenantId,
          purchase_id_param: purchaseData.purchaseId,
          supplier_id_param: purchaseData.supplierId,
          total_amount_param: totalAmount
        });
        console.log('AP record created for full amount:', totalAmount);
      } catch (apError) {
        console.error('Error creating AP record:', apError);
      }
    }

    return result;
  } catch (error) {
    console.error('Error creating enhanced purchase journal entry:', error);
    throw error;
  }
};

// Sales transaction accounting integration
export const createSalesJournalEntry = async (
  tenantId: string,
  saleData: {
    saleId: string;
    customerId?: string;
    totalAmount: number;
    discountAmount: number;
    taxAmount: number;
    payments: Array<{ method: string; amount: number }>;
    cashierId: string;
    items?: Array<{ productId: string; variantId?: string; quantity: number; unitCost?: number }>;
  }
) => {
  try {
    // Fetch customer name for better transaction description
    let customerName = 'Walk-in Customer';
    if (saleData.customerId) {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('contacts')
          .select('name, company')
          .eq('id', saleData.customerId)
          .eq('tenant_id', tenantId)
          .single();
        
        if (!customerError && customerData) {
          customerName = customerData.company || customerData.name;
        }
      } catch (error) {
        console.warn('Could not fetch customer name:', error);
      }
    }
    
    const accounts = await getDefaultAccounts(tenantId);
    const { totalAmount, discountAmount, taxAmount, payments } = saleData;
    
    const subtotal = totalAmount + discountAmount - taxAmount;
    const entries: AccountingEntry[] = [];
    
    // Handle each payment method separately
    let totalCreditAmount = 0;
    let totalCashAmount = 0;
    
    for (const payment of payments) {
      if (payment.method === 'credit') {
        totalCreditAmount += payment.amount;
      } else {
        // All non-credit payments (cash, card, etc.) go to cash account
        totalCashAmount += payment.amount;
      }
    }
    
    // Debit: Cash for non-credit payments
    if (totalCashAmount > 0) {
      if (!accounts.cash) throw new Error('Cash account not found');
      entries.push({
        account_id: accounts.cash,
        debit_amount: totalCashAmount,
        description: 'Cash/Card payment received'
      });
    }

    // Debit: Accounts Receivable for credit payments
    if (totalCreditAmount > 0) {
      if (!accounts.accounts_receivable) throw new Error('Accounts Receivable account not found');
      entries.push({
        account_id: accounts.accounts_receivable,
        debit_amount: totalCreditAmount,
        description: 'Sale on account - customer owes'
      });

      // Create AR record for credit portion only
      if (saleData.customerId && totalCreditAmount > 0) {
        try {
          await supabase.rpc('create_accounts_receivable_record', {
            tenant_id_param: tenantId,
            sale_id_param: saleData.saleId,
            customer_id_param: saleData.customerId,
            total_amount_param: totalCreditAmount
          });
          console.log('AR record created for credit amount:', totalCreditAmount);
        } catch (arError) {
          console.error('Error creating AR record:', arError);
        }
      }
    }

    // Credit: Sales Revenue
    if (!accounts.sales_revenue) throw new Error('Sales Revenue account not found');
    entries.push({
      account_id: accounts.sales_revenue,
      credit_amount: subtotal,
      description: 'Sales revenue'
    });

    // Credit: Sales Tax Payable (if applicable)
    if (taxAmount > 0 && accounts.sales_tax_payable) {
      entries.push({
        account_id: accounts.sales_tax_payable,
        credit_amount: roundAmount(taxAmount),
        description: 'Sales tax collected'
      });
    }

    // Debit: Discount Given (if applicable)
    if (discountAmount > 0 && accounts.discount_given) {
      entries.push({
        account_id: accounts.discount_given,
        debit_amount: roundAmount(discountAmount),
        description: 'Discount given to customer'
      });
    }

    // Cost of Goods Sold and Inventory adjustment
    if (saleData.items && saleData.items.length > 0 && accounts.cost_of_goods_sold && accounts.inventory) {
      const totalCOGS = saleData.items.reduce((sum, item) => {
        // Round to nearest whole number to handle fractional quantity precision issues
        const itemCOGS = (item.unitCost || 0) * item.quantity;
        return sum + roundAmount(itemCOGS);
      }, 0);

      if (totalCOGS > 0) {
        // Debit: Cost of Goods Sold
        entries.push({
          account_id: accounts.cost_of_goods_sold,
          debit_amount: roundAmount(totalCOGS),
          description: 'Cost of goods sold'
        });

        // Credit: Inventory
        entries.push({
          account_id: accounts.inventory,
          credit_amount: roundAmount(totalCOGS),
          description: 'Inventory reduction from sale'
        });
      }
    }

    const transaction: AccountingTransaction = {
      description: `Sale to ${customerName}${totalCreditAmount > 0 ? ' (Partial Credit Sale)' : ''}`,
      reference_id: saleData.saleId,
      reference_type: 'sale',
      entries
    };

    // Create the journal entry first
    const result = await createJournalEntry(tenantId, transaction, saleData.cashierId);

    // Update inventory for sale items
    if (saleData.items && saleData.items.length > 0) {
      try {
        await processSaleInventory(tenantId, saleData.saleId, saleData.items);
      } catch (inventoryError) {
        console.error('Error updating inventory for sale:', inventoryError);
        // Don't fail the transaction if inventory update fails, but log it
      }
    }

    return result;
  } catch (error) {
    console.error('Error creating sales journal entry:', error);
    throw error;
  }
};

// Enhanced purchase journal entry to work with existing accounting module
export const createPurchaseJournalEntry = async (
  tenantId: string,
  purchaseData: {
    purchaseId: string;
    supplierId: string;
    totalAmount: number;
    isReceived: boolean;
    createdBy: string;
  }
) => {
  try {
    const accounts = await getDefaultAccounts(tenantId);
    
    // Fetch supplier name for better transaction description
    let supplierName = 'Unknown Supplier';
    try {
      const { data: supplierData, error: supplierError } = await supabase
        .from('contacts')
        .select('name, company')
        .eq('id', purchaseData.supplierId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (!supplierError && supplierData) {
        supplierName = supplierData.company || supplierData.name;
      }
    } catch (error) {
      console.warn('Could not fetch supplier name:', error);
    }
    
    // Use existing accounting module structure for purchase transactions
    const transaction = {
      description: `Purchase from ${supplierName} (PO: ${purchaseData.purchaseId})`,
      reference_id: purchaseData.purchaseId,
      reference_type: 'purchase',
      entries: [
        {
          account_id: accounts.inventory,
          debit_amount: purchaseData.totalAmount,
          credit_amount: 0,
          description: 'Inventory purchased'
        },
        {
          account_id: accounts.accounts_payable,
          debit_amount: 0,
          credit_amount: purchaseData.totalAmount,
          description: 'Amount owed to supplier'
        }
      ]
    };

    if (!accounts.inventory) throw new Error('Inventory account not found');
    if (!accounts.accounts_payable) throw new Error('Accounts Payable account not found');

    // Create AP record for all purchases (they are unpaid until explicitly paid)
    try {
      await supabase.rpc('create_accounts_payable_record', {
        tenant_id_param: tenantId,
        purchase_id_param: purchaseData.purchaseId,
        supplier_id_param: purchaseData.supplierId,
        total_amount_param: purchaseData.totalAmount
      });
    } catch (apError) {
      console.error('Error creating AP record:', apError);
    }

    return await createJournalEntry(tenantId, transaction, purchaseData.createdBy);
  } catch (error) {
    console.error('Error creating purchase journal entry:', error);
    throw error;
  }
};

// Enhanced payment transaction accounting integration with proper payment method accounting
export const createPaymentJournalEntry = async (
  tenantId: string,
  paymentData: {
    paymentId: string;
    amount: number;
    paymentType: 'receivable' | 'payable';
    paymentMethod: string;
    referenceId: string;
    createdBy: string;
    paymentMethodAccountId?: string; // Optional override for specific account
  }
) => {
  try {
    const accounts = await getDefaultAccounts(tenantId);
    const entries: AccountingEntry[] = [];

    if (paymentData.paymentType === 'receivable') {
      // Customer payment received
      // Debit: Cash
      if (!accounts.cash) throw new Error('Cash account not found');
      entries.push({
        account_id: accounts.cash,
        debit_amount: paymentData.amount,
        description: 'Payment received from customer'
      });

      // Credit: Accounts Receivable
      if (!accounts.accounts_receivable) throw new Error('Accounts Receivable account not found');
      entries.push({
        account_id: accounts.accounts_receivable,
        credit_amount: paymentData.amount,
        description: 'Customer payment applied'
      });
    } else {
      // Payment to supplier
      // Debit: Accounts Payable
      if (!accounts.accounts_payable) throw new Error('Accounts Payable account not found');
      entries.push({
        account_id: accounts.accounts_payable,
        debit_amount: paymentData.amount,
        description: 'Payment to supplier'
      });

      // Credit: Cash
      if (!accounts.cash) throw new Error('Cash account not found');
      entries.push({
        account_id: accounts.cash,
        credit_amount: paymentData.amount,
        description: 'Cash paid to supplier'
      });
    }

    const transaction: AccountingTransaction = {
      description: `${paymentData.paymentType === 'receivable' ? 'Customer' : 'Supplier'} payment`,
      reference_id: paymentData.referenceId,
      reference_type: paymentData.paymentType === 'receivable' ? 'ar_payment' : 'ap_payment',
      entries
    };

    return await createJournalEntry(tenantId, transaction, paymentData.createdBy);
  } catch (error) {
    console.error('Error creating payment journal entry:', error);
    throw error;
  }
};

// Return transaction accounting integration
export const createReturnJournalEntry = async (
  tenantId: string,
  returnData: {
    returnId: string;
    originalSaleId?: string;
    refundAmount: number;
    restockAmount: number;
    processedBy: string;
  }
) => {
  try {
    const accounts = await getDefaultAccounts(tenantId);
    const entries: AccountingEntry[] = [];

    // Debit: Sales Returns (contra-revenue account)
    // Or credit sales revenue if returns account doesn't exist
    if (accounts.sales_returns) {
      entries.push({
        account_id: accounts.sales_returns,
        debit_amount: returnData.refundAmount,
        description: 'Sales return'
      });
    } else if (accounts.sales_revenue) {
      entries.push({
        account_id: accounts.sales_revenue,
        debit_amount: returnData.refundAmount,
        description: 'Sales return reversal'
      });
    }

    // Credit: Cash (refund given)
    if (!accounts.cash) throw new Error('Cash account not found');
    entries.push({
      account_id: accounts.cash,
      credit_amount: returnData.refundAmount,
      description: 'Refund given to customer'
    });

    // If items are restocked
    if (returnData.restockAmount > 0) {
      // Debit: Inventory
      if (accounts.inventory) {
        entries.push({
          account_id: accounts.inventory,
          debit_amount: returnData.restockAmount,
          description: 'Inventory restocked from return'
        });
      }

      // Credit: Cost of Goods Sold
      if (accounts.cost_of_goods_sold) {
        entries.push({
          account_id: accounts.cost_of_goods_sold,
          credit_amount: returnData.restockAmount,
          description: 'COGS adjustment for restocked items'
        });
      }
    }

    const transaction: AccountingTransaction = {
      description: `Sales return processing`,
      reference_id: returnData.returnId,
      reference_type: 'return',
      entries
    };

    return await createJournalEntry(tenantId, transaction, returnData.processedBy);
  } catch (error) {
    console.error('Error creating return journal entry:', error);
    throw error;
  }
};

// Purchase return transaction accounting integration  
export const createPurchaseReturnJournalEntry = async (
  tenantId: string,
  returnData: {
    returnId: string;
    originalPurchaseId?: string;
    supplierId: string;
    refundAmount: number;
    restockAmount: number;
    processedBy: string;
  }
) => {
  try {
    const accounts = await getDefaultAccounts(tenantId);
    const entries: AccountingEntry[] = [];

    // Debit: Accounts Payable (reduce what we owe supplier)
    if (!accounts.accounts_payable) throw new Error('Accounts Payable account not found');
    entries.push({
      account_id: accounts.accounts_payable,
      debit_amount: returnData.refundAmount,
      description: 'Purchase return - reduce supplier balance'
    });

    // Credit: Cash (refund received or credit applied)  
    if (!accounts.cash) throw new Error('Cash account not found');
    entries.push({
      account_id: accounts.cash,
      credit_amount: returnData.refundAmount,
      description: 'Purchase return refund or credit'
    });

    // If items are NOT restocked, reduce inventory
    if (returnData.restockAmount < returnData.refundAmount) {
      const nonRestockAmount = returnData.refundAmount - returnData.restockAmount;
      
      // Credit: Inventory (reduce inventory for non-restocked items)
      if (accounts.inventory) {
        entries.push({
          account_id: accounts.inventory,
          credit_amount: nonRestockAmount,
          description: 'Inventory adjustment - non-restocked returns'
        });
      }
    }

    const transaction: AccountingTransaction = {
      description: `Purchase return${returnData.originalPurchaseId ? ` for purchase ${returnData.originalPurchaseId}` : ''}`,
      reference_id: returnData.returnId,
      reference_type: 'purchase_return',
      entries
    };

    // Create AP payment record to reduce outstanding balance
    try {
      await supabase
        .from('ar_ap_payments')
        .insert({
          tenant_id: tenantId,
          payment_type: 'payable',
          reference_id: returnData.supplierId, // This should reference the AP record ID, but we'll use supplier for now
          amount: returnData.refundAmount,
          payment_method: 'purchase_return',
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: returnData.returnId,
          notes: `Purchase return credit: ${returnData.returnId}`
        });
    } catch (apError) {
      console.error('Error creating AP payment record:', apError);
      // Don't fail the transaction if AP payment creation fails
    }

    return await createJournalEntry(tenantId, transaction, returnData.processedBy);
  } catch (error) {
    console.error('Error creating purchase return journal entry:', error);
    throw error;
  }
};

// Cash drawer accounting integration
export const createCashDrawerJournalEntry = async (
  tenantId: string,
  transactionData: {
    transactionId: string;
    transactionType: string;
    amount: number;
    description: string;
    referenceType?: string;
    referenceId?: string;
    performedBy: string;
  }
) => {
  try {
    const accounts = await getDefaultAccounts(tenantId);
    
    if (!accounts.cash) {
      console.warn('Cash account not found for tenant, skipping accounting entry');
      return;
    }

    const entries: AccountingEntry[] = [];
    const { transactionType, amount, description } = transactionData;

    // Handle different types of cash drawer transactions
    switch (transactionType) {
      case 'opening_balance':
        // Debit: Cash, Credit: Owner's Equity (or Capital Account)
        entries.push({
          account_id: accounts.cash,
          debit_amount: amount,
          description: 'Cash drawer opening balance'
        });
        // For simplicity, we'll credit the equity account
        if (accounts.owner_equity || accounts.equity) {
          entries.push({
            account_id: accounts.owner_equity || accounts.equity,
            credit_amount: amount,
            description: 'Cash drawer funding'
          });
        }
        break;

      case 'drawer_transfer_out':
        // This would be handled by the transfer process itself
        // No accounting entry needed here as it's an internal transfer
        return;

      case 'drawer_transfer_in':
        // This would be handled by the transfer process itself
        // No accounting entry needed here as it's an internal transfer
        return;

      case 'bank_deposit':
        // Debit: Bank Account, Credit: Cash
        if (accounts.bank) {
          entries.push({
            account_id: accounts.bank,
            debit_amount: Math.abs(amount),
            description: 'Cash deposited to bank'
          });
          entries.push({
            account_id: accounts.cash,
            credit_amount: Math.abs(amount),
            description: 'Cash transferred to bank'
          });
        }
        break;

      case 'expense_payment':
        // This should be handled by expense management
        // For now, we'll create a simple expense entry
        entries.push({
          account_id: accounts.cash,
          credit_amount: Math.abs(amount),
          description: 'Cash expense payment'
        });
        // Debit to a general expense account if available
        if (accounts.general_expense || accounts.office_expense) {
          entries.push({
            account_id: accounts.general_expense || accounts.office_expense,
            debit_amount: Math.abs(amount),
            description: 'Expense paid with cash'
          });
        }
        break;

      case 'adjustment':
        // Cash shortage/overage adjustment
        if (amount > 0) {
          // Cash overage
          entries.push({
            account_id: accounts.cash,
            debit_amount: amount,
            description: 'Cash overage adjustment'
          });
          if (accounts.misc_income || accounts.other_income) {
            entries.push({
              account_id: accounts.misc_income || accounts.other_income,
              credit_amount: amount,
              description: 'Cash overage'
            });
          }
        } else {
          // Cash shortage
          entries.push({
            account_id: accounts.cash,
            credit_amount: Math.abs(amount),
            description: 'Cash shortage adjustment'
          });
          if (accounts.misc_expense || accounts.other_expense) {
            entries.push({
              account_id: accounts.misc_expense || accounts.other_expense,
              debit_amount: Math.abs(amount),
              description: 'Cash shortage'
            });
          }
        }
        break;

      default:
        // For other transaction types, we might not need accounting entries
        console.log(`No accounting integration for transaction type: ${transactionType}`);
        return;
    }

    // Only create journal entry if we have entries
    if (entries.length > 0) {
      const transaction: AccountingTransaction = {
        description: description,
        reference_id: transactionData.transactionId,
        reference_type: 'cash_transaction',
        entries
      };

      return await createJournalEntry(tenantId, transaction, transactionData.performedBy);
    }
  } catch (error) {
    console.error('Error creating cash drawer journal entry:', error);
    // Don't throw error to avoid breaking cash drawer operations
    console.warn('Cash drawer operation completed but accounting entry failed');
  }
};
