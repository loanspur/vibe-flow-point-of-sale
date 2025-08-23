// Centralized business configuration constants
export const BUSINESS_CONFIG = {
  DEFAULTS: {
    CURRENCY: {
      code: 'USD',
      symbol: '$'
    },
    TIMEZONE: 'UTC',
    TAX: {
      rate: 0,
      name: 'Tax',
      inclusive: false
    },
    COMPANY: {
      name: 'Your Business',
      country: 'United States'
    },
    POS: {
      autoPrintReceipt: true,
      askCustomerInfo: false,
      enableDiscounts: true,
      maxDiscountPercent: 100,
      enableTips: false,
      defaultPaymentMethod: 'cash'
    },
    PRODUCT: {
      enableBrands: false,
      enableProductUnits: true,
      enableBarcodeScanning: true,
      enableNegativeStock: false,
      enableWarranty: false,
      enableFixedPricing: false,
      enableProductExpiry: true,
      autoGenerateSku: true,
      enableRetailPricing: true,
      enableWholesalePricing: false,
      enableComboProducts: false,
      defaultMarkupPercentage: 0,
      stockAccountingMethod: 'FIFO'
    },
    INVENTORY: {
      lowStockThreshold: 10,
      lowStockAlerts: true,
      enableOverselling: false,
      enableMultiLocation: false
    },
    SECURITY: {
      maxLoginAttempts: 3,
      accountLockoutDuration: 15,
      sessionTimeoutMinutes: 60,
      requirePasswordChange: false,
      passwordExpiryDays: 90
    },
    DOCUMENTS: {
      invoiceAutoNumber: true,
      quoteAutoNumber: true,
      deliveryNoteAutoNumber: true,
      quoteValidityDays: 30,
      printCustomerCopy: true,
      printMerchantCopy: true
    }
  },
  
  BUSINESS_HOURS: {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "10:00", close: "16:00", closed: false },
    sunday: { open: "12:00", close: "16:00", closed: true }
  }
};
