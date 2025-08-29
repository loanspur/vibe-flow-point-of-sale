/**
 * Centralized configuration for migration defaults
 * This eliminates hard-coded values scattered throughout the codebase
 */

export const MIGRATION_DEFAULTS = {
  // Product defaults
  PRODUCT: {
    DEFAULT_STOCK_QUANTITY: 0,
    DEFAULT_COST_PRICE: 0,
    DEFAULT_RETAIL_PRICE: 0,
    DEFAULT_WHOLESALE_PRICE: 0,
    DEFAULT_SHIPPING_FEE: 0.00,
    DEFAULT_MARKUP_PERCENTAGE: 0,
    STOCK_ACCOUNTING_METHOD: 'FIFO' as const,
  },

  // Contact defaults
  CONTACT: {
    DEFAULT_CONTACT_TYPE: 'customer' as const,
    DEFAULT_SHIPPING_FEE: 0.00,
    DEFAULT_CREDIT_LIMIT: 0.00,
    DEFAULT_CREDIT_BALANCE: 0.00,
    DEFAULT_SHIPPING_ZONES: [] as string[],
    DEFAULT_SHIPPING_DOCUMENTS: [] as any[],
  },

  // Payment method defaults
  PAYMENT_METHODS: {
    CASH: {
      name: 'Cash',
      type: 'cash' as const,
      requires_reference: false,
      icon: '💵',
      color: '#28a745',
    },
    CARD: {
      name: 'Card',
      type: 'card' as const,
      requires_reference: false,
      icon: '💳',
      color: '#007bff',
    },
    MOBILE_MONEY: {
      name: 'M-Pesa',
      type: 'mobile_money' as const,
      requires_reference: true,
      icon: '📱',
      color: '#ff6b35',
    },
    BANK_TRANSFER: {
      name: 'Bank Transfer',
      type: 'bank_transfer' as const,
      requires_reference: true,
      icon: '🏦',
      color: '#6f42c1',
    },
    CREDIT: {
      name: 'Credit',
      type: 'credit' as const,
      requires_reference: true,
      icon: '📋',
      color: '#fd7e14',
    },
    CHEQUE: {
      name: 'Cheque',
      type: 'other' as const,
      requires_reference: true,
      icon: '📄',
      color: '#20c997',
    },
  },

  // Sales defaults
  SALES: {
    DEFAULT_SHIPPING_FEE: 0.00,
    DEFAULT_SHIPPING_INCLUDED_IN_TOTAL: true,
    DEFAULT_SHIPPING_PAYMENT_STATUS: 'pending' as const,
  },

  // Inventory defaults
  INVENTORY: {
    DEFAULT_LOW_STOCK_THRESHOLD: 10,
    DEFAULT_NEGATIVE_STOCK_ENABLED: false,
    DEFAULT_OVERSELLING_ENABLED: false,
    DEFAULT_LOW_STOCK_ALERTS: true,
  },

  // Migration defaults
  MIGRATION: {
    DEFAULT_BATCH_SIZE: 100,
    MAX_RETRY_ATTEMPTS: 3,
    SKU_GENERATION_MAX_ATTEMPTS: 10,
    SKU_TIMESTAMP_LENGTH: 4,
    SKU_RANDOM_SUFFIX_LENGTH: 3,
  },
};

export const CONTACT_TYPES = [
  'customer',
  'supplier', 
  'vendor',
  'agent',
  'shipping_agent',
  'sales_rep',
  'partner',
] as const;

export const PAYMENT_TYPES = [
  'cash',
  'card',
  'mobile_money',
  'bank_transfer',
  'credit',
  'other',
] as const;

export const SHIPPING_STATUSES = [
  'pending',
  'in_transit',
  'delivered',
  'cancelled',
] as const;

export const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'overdue',
] as const;


