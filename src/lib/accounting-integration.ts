import { supabase } from '@/integrations/supabase/client';
import { processSaleInventory } from './inventory-integration';
import { initializeDefaultChartOfAccounts } from './default-accounts';

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
    // Validate double-entry bookkeeping
    const totalDebits = transaction.entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = transaction.entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry must balance: debits must equal credits');
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
        credit_amount: taxAmount,
        description: 'Sales tax collected'
      });
    }

    // Debit: Discount Given (if applicable)
    if (discountAmount > 0 && accounts.discount_given) {
      entries.push({
        account_id: accounts.discount_given,
        debit_amount: discountAmount,
        description: 'Discount given to customer'
      });
    }

    // Cost of Goods Sold and Inventory adjustment
    if (saleData.items && saleData.items.length > 0 && accounts.cost_of_goods_sold && accounts.inventory) {
      const totalCOGS = saleData.items.reduce((sum, item) => {
        return sum + ((item.unitCost || 0) * item.quantity);
      }, 0);

      if (totalCOGS > 0) {
        // Debit: Cost of Goods Sold
        entries.push({
          account_id: accounts.cost_of_goods_sold,
          debit_amount: totalCOGS,
          description: 'Cost of goods sold'
        });

        // Credit: Inventory
        entries.push({
          account_id: accounts.inventory,
          credit_amount: totalCOGS,
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

// Payment transaction accounting integration
export const createPaymentJournalEntry = async (
  tenantId: string,
  paymentData: {
    paymentId: string;
    amount: number;
    paymentType: 'receivable' | 'payable';
    paymentMethod: string;
    referenceId: string;
    createdBy: string;
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
