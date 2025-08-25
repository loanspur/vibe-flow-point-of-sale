/**
 * System-wide constants to replace hard-coded values
 * This ensures consistency and easy maintenance
 */

// App Configuration
export const APP_CONFIG = {
  name: 'VibePOS',
  version: '1.0.0',
  description: 'Modern Point of Sale System',
  supportEmail: 'support@vibepos.com',
  defaultCurrency: 'KES',
  defaultTimezone: 'Africa/Nairobi',
  defaultDateFormat: 'DD/MM/YYYY',
  defaultLanguage: 'en'
} as const;

// URLs and Domains
export const URLS = {
  mainSite: 'https://vibenet.online',
  dashboardDomain: 'vibenet.shop',
  onlineDomain: 'vibenet.online',
  apiBase: 'https://qwtybhvdbbkbcelisuek.supabase.co',
  supportUrl: 'https://support.vibepos.com',
  docsUrl: 'https://docs.vibepos.com'
} as const;

// Social Media Links
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/vibepos',
  twitter: 'https://twitter.com/vibepos',
  instagram: 'https://instagram.com/vibepos',
  linkedin: 'https://linkedin.com/company/vibepos',
  youtube: 'https://youtube.com/@vibepos'
} as const;

// Business Rules
export const BUSINESS_RULES = {
  defaultTaxRate: 0.16, // 16% VAT in Kenya
  defaultProfitMargin: 0.2, // 20%
  minStockLevel: 5,
  maxDiscountPercent: 100,
  sessionTimeoutMinutes: 60,
  passwordExpiryDays: 90,
  maxLoginAttempts: 3,
  accountLockoutMinutes: 15,
  invoiceValidityDays: 30,
  quoteValidityDays: 30
} as const;

// File Upload Limits
export const UPLOAD_LIMITS = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxImagesPerProduct: 5
} as const;

// Pagination Defaults
export const PAGINATION = {
  defaultPageSize: 10,
  maxPageSize: 100,
  pageSizeOptions: [10, 25, 50, 100]
} as const;

// Cache Times (in milliseconds)
export const CACHE_TIMES = {
  shortTerm: 2 * 60 * 1000,      // 2 minutes
  mediumTerm: 5 * 60 * 1000,     // 5 minutes
  longTerm: 10 * 60 * 1000,      // 10 minutes
  veryLongTerm: 30 * 60 * 1000,  // 30 minutes
  businessSettings: 10 * 60 * 1000, // 10 minutes for business settings
  dashboard: 2 * 60 * 1000        // 2 minutes for dashboard data
} as const;

// Email Templates
export const EMAIL_TEMPLATES = {
  invoiceSent: 'Invoice Sent',
  quoteSent: 'Quote Sent',
  paymentReceived: 'Payment Received',
  welcomeUser: 'Welcome User',
  passwordReset: 'Password Reset',
  orderConfirmation: 'Order Confirmation'
} as const;

// User Roles and Permissions
export const USER_ROLES = {
  superadmin: 'superadmin',
  admin: 'admin',
  manager: 'manager',
  cashier: 'cashier',
  user: 'user'
} as const;

// Product Types
export const PRODUCT_TYPES = {
  simple: 'simple',
  variable: 'variable',
  combo: 'combo',
  service: 'service'
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  cash: 'cash',
  card: 'card',
  mpesa: 'mpesa',
  bank: 'bank_transfer',
  credit: 'credit'
} as const;

// Order/Sale Statuses
export const ORDER_STATUSES = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  cancelled: 'cancelled',
  refunded: 'refunded',
  draft: 'draft'
} as const;

// Invoice/Quote Statuses
export const DOCUMENT_STATUSES = {
  draft: 'draft',
  sent: 'sent',
  viewed: 'viewed',
  accepted: 'accepted',
  declined: 'declined',
  expired: 'expired'
} as const;

// Contact Types
export const CONTACT_TYPES = {
  customer: 'customer',
  supplier: 'supplier',
  vendor: 'vendor',
  agent: 'agent'
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error'
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent'
} as const;

// Stock Accounting Methods
export const STOCK_METHODS = {
  fifo: 'FIFO',
  lifo: 'LIFO',
  weighted: 'Weighted Average'
} as const;

// Currency Codes (common ones)
export const CURRENCY_CODES = {
  KES: 'KES',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  UGX: 'UGX',
  TZS: 'TZS'
} as const;

// Date Formats
export const DATE_FORMATS = {
  'DD/MM/YYYY': 'DD/MM/YYYY',
  'MM/DD/YYYY': 'MM/DD/YYYY',
  'YYYY-MM-DD': 'YYYY-MM-DD',
  'DD-MM-YYYY': 'DD-MM-YYYY'
} as const;

// Time Zones (African focus)
export const TIMEZONES = {
  'Africa/Nairobi': 'Africa/Nairobi',
  'Africa/Lagos': 'Africa/Lagos',
  'Africa/Cairo': 'Africa/Cairo',
  'Africa/Johannesburg': 'Africa/Johannesburg',
  'UTC': 'UTC'
} as const;

// Billing Periods
export const BILLING_PERIODS = {
  monthly: 'month',
  quarterly: 'quarter',
  annually: 'year'
} as const;

// Report Types
export const REPORT_TYPES = {
  sales: 'sales',
  inventory: 'inventory',
  financial: 'financial',
  customer: 'customer',
  tax: 'tax'
} as const;

// Feature Flags
export const FEATURES = {
  multiLocation: 'multi_location',
  onlineOrders: 'online_orders',
  loyaltyProgram: 'loyalty_program',
  giftCards: 'gift_cards',
  comboProducts: 'combo_products',
  retailPricing: 'retail_pricing',
  wholesalePricing: 'wholesale_pricing',
  barcodeScanning: 'barcode_scanning',
  negativeStock: 'negative_stock',
  brands: 'brands',
  productUnits: 'product_units',
  warranty: 'warranty',
  fixedPricing: 'fixed_pricing',
  userRoles: 'user_roles'
} as const;

// System Limits
export const SYSTEM_LIMITS = {
  maxProductsPerTenant: 10000,
  maxUsersPerTenant: 100,
  maxLocationsPerTenant: 50,
  maxCategoriesPerTenant: 500,
  maxVariantsPerProduct: 20,
  maxItemsPerSale: 100,
  maxDiscountValue: 100
} as const;

// Error Codes
export const ERROR_CODES = {
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  validationError: 'VALIDATION_ERROR',
  duplicateEntry: 'DUPLICATE_ENTRY',
  insufficientStock: 'INSUFFICIENT_STOCK',
  paymentFailed: 'PAYMENT_FAILED',
  quotaExceeded: 'QUOTA_EXCEEDED'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  created: 'Item created successfully',
  updated: 'Item updated successfully',
  deleted: 'Item deleted successfully',
  saved: 'Changes saved successfully',
  sent: 'Sent successfully',
  uploaded: 'File uploaded successfully'
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  required: 'This field is required',
  invalid: 'Invalid value',
  tooShort: 'Value is too short',
  tooLong: 'Value is too long',
  invalidEmail: 'Invalid email address',
  invalidPhone: 'Invalid phone number',
  fileTooBig: 'File size exceeds limit',
  unsupportedFormat: 'Unsupported file format'
} as const;