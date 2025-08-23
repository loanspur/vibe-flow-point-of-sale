import { useApp } from '@/contexts/AppContext';
import { useBusinessSettingsManager } from './useBusinessSettingsManager';
import { BUSINESS_CONFIG } from '@/lib/business-config';

/**
 * Unified hook for accessing business settings across the application
 * This ensures consistent access to configuration flags and reduces code duplication
 */
export const useBusinessSettings = () => {
  const { settings } = useBusinessSettingsManager();
  
  return {
    // Sales/POS Settings
    pos: {
      autoPrintReceipt: settings?.pos_auto_print_receipt ?? BUSINESS_CONFIG.DEFAULTS.POS.autoPrintReceipt,
      askCustomerInfo: settings?.pos_ask_customer_info ?? BUSINESS_CONFIG.DEFAULTS.POS.askCustomerInfo,
      enableDiscounts: settings?.pos_enable_discounts ?? BUSINESS_CONFIG.DEFAULTS.POS.enableDiscounts,
      maxDiscountPercent: settings?.pos_max_discount_percent ?? BUSINESS_CONFIG.DEFAULTS.POS.maxDiscountPercent,
      enableTips: settings?.pos_enable_tips ?? BUSINESS_CONFIG.DEFAULTS.POS.enableTips,
      defaultPaymentMethod: settings?.pos_default_payment_method ?? BUSINESS_CONFIG.DEFAULTS.POS.defaultPaymentMethod,
    },
    
    // Product Settings
    product: {
      enableBrands: settings?.enable_brands ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableBrands,
      enableProductUnits: settings?.enable_product_units ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableProductUnits,
      enableBarcodeScanning: settings?.enable_barcode_scanning ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableBarcodeScanning,
      enableNegativeStock: settings?.enable_negative_stock ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableNegativeStock,
      enableWarranty: settings?.enable_warranty ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableWarranty,
      enableFixedPricing: settings?.enable_fixed_pricing ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableFixedPricing,
      enableProductExpiry: settings?.enable_product_expiry ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableProductExpiry,
      autoGenerateSku: settings?.auto_generate_sku ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.autoGenerateSku,
      enableRetailPricing: settings?.enable_retail_pricing ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableRetailPricing,
      enableWholesalePricing: settings?.enable_wholesale_pricing ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableWholesalePricing,
      enableComboProducts: settings?.enable_combo_products ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.enableComboProducts,
      defaultMarkupPercentage: settings?.default_markup_percentage ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.defaultMarkupPercentage,
      stockAccountingMethod: settings?.stock_accounting_method ?? BUSINESS_CONFIG.DEFAULTS.PRODUCT.stockAccountingMethod,
    },
    
    // Purchase Settings
    purchase: {
      autoReceive: settings?.purchase_auto_receive ?? BUSINESS_CONFIG.DEFAULTS.PURCHASE.autoReceive,
      enablePartialReceive: settings?.purchase_enable_partial_receive ?? BUSINESS_CONFIG.DEFAULTS.PURCHASE.enablePartialReceive,
      defaultTaxRate: settings?.purchase_default_tax_rate ?? BUSINESS_CONFIG.DEFAULTS.PURCHASE.defaultTaxRate,
    },
    
    // Inventory Settings
    inventory: {
      lowStockThreshold: settings?.low_stock_threshold ?? BUSINESS_CONFIG.DEFAULTS.INVENTORY.lowStockThreshold,
      lowStockAlerts: settings?.low_stock_alerts ?? BUSINESS_CONFIG.DEFAULTS.INVENTORY.lowStockAlerts,
      enableOverselling: settings?.enable_overselling ?? BUSINESS_CONFIG.DEFAULTS.INVENTORY.enableOverselling,
      enableNegativeStock: settings?.enable_negative_stock ?? BUSINESS_CONFIG.DEFAULTS.INVENTORY.enableNegativeStock,
      enableMultiLocation: settings?.enable_multi_location ?? BUSINESS_CONFIG.DEFAULTS.INVENTORY.enableMultiLocation,
    },
    
    // General Business Settings
    general: {
      enableUserRoles: settings?.enable_user_roles ?? BUSINESS_CONFIG.DEFAULTS.GENERAL.enableUserRoles,
      enableLoyaltyProgram: settings?.enable_loyalty_program ?? BUSINESS_CONFIG.DEFAULTS.GENERAL.enableLoyaltyProgram,
      enableGiftCards: settings?.enable_gift_cards ?? BUSINESS_CONFIG.DEFAULTS.GENERAL.enableGiftCards,
      enableOnlineOrders: settings?.enable_online_orders ?? BUSINESS_CONFIG.DEFAULTS.GENERAL.enableOnlineOrders,
      emailNotifications: settings?.email_notifications ?? BUSINESS_CONFIG.DEFAULTS.GENERAL.emailNotifications,
      dailyReports: settings?.daily_reports ?? BUSINESS_CONFIG.DEFAULTS.GENERAL.dailyReports,
    },
    
    // Tax Settings
    tax: {
      defaultTaxRate: settings?.default_tax_rate ?? BUSINESS_CONFIG.DEFAULTS.TAX.rate,
      taxInclusive: settings?.tax_inclusive ?? BUSINESS_CONFIG.DEFAULTS.TAX.inclusive,
      taxName: settings?.tax_name ?? BUSINESS_CONFIG.DEFAULTS.TAX.name,
    },
    
    // Document Settings
    documents: {
      invoiceAutoNumber: settings?.invoice_auto_number ?? BUSINESS_CONFIG.DEFAULTS.DOCUMENTS.invoiceAutoNumber,
      quoteAutoNumber: settings?.quote_auto_number ?? BUSINESS_CONFIG.DEFAULTS.DOCUMENTS.quoteAutoNumber,
      deliveryNoteAutoNumber: settings?.delivery_note_auto_number ?? BUSINESS_CONFIG.DEFAULTS.DOCUMENTS.deliveryNoteAutoNumber,
      quoteValidityDays: settings?.quote_validity_days ?? BUSINESS_CONFIG.DEFAULTS.DOCUMENTS.quoteValidityDays,
      printCustomerCopy: settings?.print_customer_copy ?? BUSINESS_CONFIG.DEFAULTS.DOCUMENTS.printCustomerCopy,
      printMerchantCopy: settings?.print_merchant_copy ?? BUSINESS_CONFIG.DEFAULTS.DOCUMENTS.printMerchantCopy,
    },
    
    // Communication Settings
    communication: {
      smsNotifications: settings?.sms_enable_notifications ?? BUSINESS_CONFIG.DEFAULTS.COMMUNICATION.smsNotifications,
      whatsappNotifications: settings?.whatsapp_enable_notifications ?? BUSINESS_CONFIG.DEFAULTS.COMMUNICATION.whatsappNotifications,
    },
    
    // Raw settings for direct access when needed
    raw: settings,
  };
};