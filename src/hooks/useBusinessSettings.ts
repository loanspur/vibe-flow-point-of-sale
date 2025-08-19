import { useApp } from '@/contexts/AppContext';

/**
 * Unified hook for accessing business settings across the application
 * This ensures consistent access to configuration flags and reduces code duplication
 */
export const useBusinessSettings = () => {
  const { businessSettings } = useApp();
  
  return {
    // Sales/POS Settings
    pos: {
      autoPrintReceipt: (businessSettings as any)?.pos_auto_print_receipt ?? true,
      askCustomerInfo: (businessSettings as any)?.pos_ask_customer_info ?? false,
      enableDiscounts: (businessSettings as any)?.pos_enable_discounts ?? true,
      maxDiscountPercent: (businessSettings as any)?.pos_max_discount_percent ?? 100,
      enableTips: (businessSettings as any)?.pos_enable_tips ?? false,
      defaultPaymentMethod: (businessSettings as any)?.pos_default_payment_method ?? 'cash',
    },
    
    // Product Settings
    product: {
      enableBrands: (businessSettings as any)?.enable_brands ?? false,
      enableProductUnits: (businessSettings as any)?.enable_product_units ?? true,
      enableBarcodeScanning: (businessSettings as any)?.enable_barcode_scanning ?? true,
      enableNegativeStock: (businessSettings as any)?.enable_negative_stock ?? false,
      enableWarranty: (businessSettings as any)?.enable_warranty ?? false,
      enableFixedPricing: (businessSettings as any)?.enable_fixed_pricing ?? false,
      autoGenerateSku: (businessSettings as any)?.auto_generate_sku ?? true,
      enableRetailPricing: (businessSettings as any)?.enable_retail_pricing ?? true,
      enableWholesalePricing: (businessSettings as any)?.enable_wholesale_pricing ?? false,
      enableComboProducts: (businessSettings as any)?.enable_combo_products ?? false,
      defaultMarkupPercentage: (businessSettings as any)?.default_markup_percentage ?? 0,
      stockAccountingMethod: (businessSettings as any)?.stock_accounting_method ?? 'FIFO',
    },
    
    // Purchase Settings
    purchase: {
      autoReceive: (businessSettings as any)?.purchase_auto_receive ?? false,
      enablePartialReceive: (businessSettings as any)?.purchase_enable_partial_receive ?? true,
      defaultTaxRate: (businessSettings as any)?.purchase_default_tax_rate ?? 0,
    },
    
    // Inventory Settings
    inventory: {
      lowStockThreshold: (businessSettings as any)?.low_stock_threshold ?? 10,
      lowStockAlerts: (businessSettings as any)?.low_stock_alerts ?? true,
      enableOverselling: (businessSettings as any)?.enable_overselling ?? false,
      enableMultiLocation: (businessSettings as any)?.enable_multi_location ?? false,
    },
    
    // General Business Settings
    general: {
      enableUserRoles: (businessSettings as any)?.enable_user_roles ?? true,
      enableLoyaltyProgram: (businessSettings as any)?.enable_loyalty_program ?? false,
      enableGiftCards: (businessSettings as any)?.enable_gift_cards ?? false,
      enableOnlineOrders: (businessSettings as any)?.enable_online_orders ?? false,
      emailNotifications: (businessSettings as any)?.email_notifications ?? true,
      dailyReports: (businessSettings as any)?.daily_reports ?? true,
    },
    
    // Tax Settings
    tax: {
      defaultTaxRate: (businessSettings as any)?.default_tax_rate ?? 0,
      taxInclusive: (businessSettings as any)?.tax_inclusive ?? false,
      taxName: (businessSettings as any)?.tax_name ?? 'Tax',
    },
    
    // Document Settings
    documents: {
      invoiceAutoNumber: (businessSettings as any)?.invoice_auto_number ?? true,
      quoteAutoNumber: (businessSettings as any)?.quote_auto_number ?? true,
      deliveryNoteAutoNumber: (businessSettings as any)?.delivery_note_auto_number ?? true,
      quoteValidityDays: (businessSettings as any)?.quote_validity_days ?? 30,
      printCustomerCopy: (businessSettings as any)?.print_customer_copy ?? true,
      printMerchantCopy: (businessSettings as any)?.print_merchant_copy ?? true,
    },
    
    // Communication Settings
    communication: {
      smsNotifications: (businessSettings as any)?.sms_enable_notifications ?? false,
      whatsappNotifications: (businessSettings as any)?.whatsapp_enable_notifications ?? false,
    },
    
    // Raw settings for direct access when needed
    raw: businessSettings,
  };
};