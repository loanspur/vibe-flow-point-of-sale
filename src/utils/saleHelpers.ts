// Centralized sale helper functions to reduce code duplication

import { supabase } from '@/integrations/supabase/client';

export interface SaleItem {
  product_id: string;
  product_name: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PaymentRecord {
  id: string;
  method: string;
  amount: number;
  reference?: string;
}

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `R${timestamp.slice(-6)}${random}`;
};

export const calculateSaleTotal = (
  items: SaleItem[],
  discountAmount: number = 0,
  taxAmount: number = 0,
  shippingAmount: number = 0
): number => {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  return subtotal - discountAmount + taxAmount + shippingAmount;
};

export const validateSaleData = (
  items: SaleItem[],
  payments: PaymentRecord[],
  mode: 'sale' | 'quote'
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('At least one item is required');
  }

  if (mode === 'sale') {
    const totalAmount = calculateSaleTotal(items);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (totalPayments < totalAmount && !payments.some(p => p.method === 'credit')) {
      errors.push('Insufficient payment amount');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const prepareSaleItemsData = (
  saleId: string,
  items: SaleItem[],
  products: any[]
) => {
  return items.map(item => {
    const product = products.find(p => p.id === item.product_id);
    return {
      sale_id: saleId,
      product_id: item.product_id,
      variant_id: item.variant_id && item.variant_id !== "no-variant" && item.variant_id !== "" ? item.variant_id : null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      unit_id: product?.unit_id || null,
    };
  });
};

export const updateCashDrawer = async (
  tenantId: string,
  userId: string,
  cashPayments: PaymentRecord[],
  receiptNumber: string,
  saleId: string
) => {
  for (const cashPayment of cashPayments) {
    try {
      const { data: drawer } = await supabase
        .from("cash_drawers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("status", "open")
        .eq("is_active", true)
        .maybeSingle();

      if (drawer) {
        await supabase
          .from("cash_drawers")
          .update({ 
            current_balance: drawer.current_balance + cashPayment.amount 
          })
          .eq("id", drawer.id);

        await supabase
          .from("cash_transactions")
          .insert({
            tenant_id: tenantId,
            cash_drawer_id: drawer.id,
            transaction_type: "sale_payment",
            amount: cashPayment.amount,
            balance_after: drawer.current_balance + cashPayment.amount,
            description: `Sale payment - Receipt: ${receiptNumber}`,
            reference_id: saleId,
            reference_type: "sale",
            performed_by: userId,
          });
      }
    } catch (error) {
      console.error('Error updating cash drawer:', error);
      // Don't fail the sale if cash drawer update fails
    }
  }
};