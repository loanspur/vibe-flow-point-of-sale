/**
 * Centralized UI text constants to replace hardcoded strings
 * This ensures consistency and easy maintenance across the application
 */

export const UI_TEXT = {
  // Button Labels
  BUTTONS: {
    PROCESSING: 'Processing...',
    SAVING: 'Saving...',
    COMPLETE_SALE: 'Complete Sale',
    SAVE_QUOTE: 'Save Quote',
    CONFIRM_SALE: 'Confirm Sale',
    CANCEL: 'Cancel',
    SUBMIT: 'Submit',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
    ADD: 'Add',
    REMOVE: 'Remove',
    CLEAR: 'Clear',
    RESET: 'Reset',
    REFRESH: 'Refresh',
    RETRY: 'Retry',
    CONTINUE: 'Continue',
    BACK: 'Back',
    NEXT: 'Next',
    FINISH: 'Finish',
    CLOSE: 'Close',
    OK: 'OK',
    YES: 'Yes',
    NO: 'No'
  },

  // Form Labels
  FORMS: {
    CUSTOMER: 'Customer',
    PRODUCT: 'Product',
    QUANTITY: 'Quantity',
    PRICE: 'Price',
    TOTAL: 'Total',
    SUBTOTAL: 'Subtotal',
    TAX: 'Tax',
    DISCOUNT: 'Discount',
    SHIPPING: 'Shipping',
    PAYMENT: 'Payment',
    REFERENCE: 'Reference',
    NOTES: 'Notes',
    DESCRIPTION: 'Description',
    AMOUNT: 'Amount',
    DATE: 'Date',
    TIME: 'Time',
    STATUS: 'Status',
    TYPE: 'Type',
    CATEGORY: 'Category',
    BRAND: 'Brand',
    SKU: 'SKU',
    BARCODE: 'Barcode',
    STOCK: 'Stock',
    COST: 'Cost',
    PROFIT: 'Profit',
    MARGIN: 'Margin'
  },

  // Dialog Titles
  DIALOGS: {
    CONFIRM_SALE: 'Confirm Sale',
    CONFIRM_DELETE: 'Confirm Delete',
    CONFIRM_ACTION: 'Confirm Action',
    ADD_ITEM: 'Add Item',
    EDIT_ITEM: 'Edit Item',
    DELETE_ITEM: 'Delete Item',
    SAVE_CHANGES: 'Save Changes',
    DISCARD_CHANGES: 'Discard Changes',
    UNSAVED_CHANGES: 'Unsaved Changes'
  },

  // Dialog Descriptions
  DIALOG_DESCRIPTIONS: {
    CONFIRM_SALE: 'Are you sure you want to complete this sale? This action cannot be undone.',
    CONFIRM_DELETE: 'Are you sure you want to delete this item? This action cannot be undone.',
    UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave without saving?'
  },

  // Status Messages
  STATUS: {
    LOADING: 'Loading...',
    SAVING: 'Saving...',
    PROCESSING: 'Processing...',
    SUCCESS: 'Success',
    ERROR: 'Error',
    WARNING: 'Warning',
    INFO: 'Information',
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    ENABLED: 'Enabled',
    DISABLED: 'Disabled'
  },

  // Error Messages
  ERRORS: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_NUMBER: 'Please enter a valid number',
    INVALID_DATE: 'Please enter a valid date',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied.',
    NOT_FOUND: 'The requested resource was not found.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    UNKNOWN_ERROR: 'An unknown error occurred. Please try again.'
  },

  // Success Messages
  SUCCESS: {
    SALE_COMPLETED: 'Sale completed successfully',
    QUOTE_SAVED: 'Quote saved successfully',
    ITEM_ADDED: 'Item added successfully',
    ITEM_UPDATED: 'Item updated successfully',
    ITEM_DELETED: 'Item deleted successfully',
    CHANGES_SAVED: 'Changes saved successfully',
    DATA_IMPORTED: 'Data imported successfully',
    DATA_EXPORTED: 'Data exported successfully',
    SETTINGS_SAVED: 'Settings saved successfully'
  },

  // Placeholders
  PLACEHOLDERS: {
    SEARCH: 'Search...',
    SELECT_OPTION: 'Select an option...',
    ENTER_VALUE: 'Enter value...',
    ENTER_EMAIL: 'Enter email address...',
    ENTER_PHONE: 'Enter phone number...',
    ENTER_NAME: 'Enter name...',
    ENTER_DESCRIPTION: 'Enter description...',
    ENTER_NOTES: 'Enter notes...',
    SELECT_DATE: 'Select date...',
    SELECT_TIME: 'Select time...',
    NO_RESULTS: 'No results found',
    NO_DATA: 'No data available',
    LOADING_DATA: 'Loading data...'
  },

  // Section Headers
  SECTIONS: {
    SALE_SUMMARY: 'Sale Summary',
    PAYMENT: 'Payment',
    SHIPPING: 'Shipping',
    CUSTOMER_INFO: 'Customer Information',
    PRODUCT_DETAILS: 'Product Details',
    ORDER_SUMMARY: 'Order Summary',
    PAYMENT_METHODS: 'Payment Methods',
    SHIPPING_OPTIONS: 'Shipping Options',
    TAX_CALCULATION: 'Tax Calculation',
    DISCOUNT_APPLICATION: 'Discount Application'
  },

  // Time Constants
  TIME: {
    HOURS_24: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    DAYS_30: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    MINUTES_5: 5 * 60 * 1000, // 5 minutes in milliseconds
    SECONDS_30: 30 * 1000 // 30 seconds in milliseconds
  },

  // Reference Prefixes
  REFERENCE_PREFIXES: {
    SALE: 'SALE',
    QUOTE: 'QUO',
    RECEIPT: 'RCP',
    INVOICE: 'INV',
    PURCHASE: 'PUR',
    RETURN: 'RET',
    ADJUSTMENT: 'ADJ',
    TRANSFER: 'TRF',
    PAYMENT: 'PAY',
    REFUND: 'REF'
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CASH: 'Cash',
    CARD: 'Card',
    MOBILE_MONEY: 'Mobile Money',
    BANK_TRANSFER: 'Bank Transfer',
    CREDIT: 'Credit',
    CHEQUE: 'Cheque',
    MIXED: 'Mixed Payment'
  },

  // Currency
  CURRENCY: {
    DEFAULT: 'KES',
    SYMBOL: 'KSh',
    DECIMAL_PLACES: 2
  }
} as const;

// Helper functions for common operations
export const uiHelpers = {
  /**
   * Generate a unique reference number
   */
  generateReference: (prefix: string, includeTimestamp = true): string => {
    const timestamp = includeTimestamp ? Date.now() : '';
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${includeTimestamp ? '-' : ''}${random}`;
  },

  /**
   * Format currency amount
   */
  formatCurrency: (amount: number, currency = UI_TEXT.CURRENCY.DEFAULT): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: UI_TEXT.CURRENCY.DECIMAL_PLACES,
      maximumFractionDigits: UI_TEXT.CURRENCY.DECIMAL_PLACES
    }).format(amount);
  },

  /**
   * Get button text based on loading state
   */
  getButtonText: (baseText: string, isLoading: boolean): string => {
    return isLoading ? UI_TEXT.BUTTONS.PROCESSING : baseText;
  },

  /**
   * Get status text with appropriate styling
   */
  getStatusText: (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};
