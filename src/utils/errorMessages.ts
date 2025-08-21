// Centralized error messages to remove hardcoded strings across components

export const ERROR_MESSAGES = {
  // Authentication errors
  USER_NOT_AUTHENTICATED: "User not authenticated",
  NO_TENANT_ASSIGNED: "User not assigned to a tenant",
  INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action",

  // Sale errors
  SALE_COMPLETION_FAILED: "Failed to complete sale",
  SALE_NOT_FOUND: "Sale not found",
  INVALID_SALE_DATA: "Invalid sale data provided",
  PAYMENT_REQUIRED: "Please complete payment before finalizing sale",
  ITEMS_REQUIRED: "Please add items to the sale before processing payment",

  // Inventory errors
  INSUFFICIENT_STOCK: "Insufficient stock available",
  PRODUCT_NOT_FOUND: "Product not found",
  INVALID_QUANTITY: "Invalid quantity specified",

  // Customer errors
  CUSTOMER_NOT_FOUND: "Customer not found",
  INVALID_CUSTOMER_DATA: "Invalid customer data provided",

  // Payment errors
  PAYMENT_FAILED: "Payment processing failed",
  INVALID_PAYMENT_METHOD: "Invalid payment method selected",
  DUPLICATE_REFERENCE: "This receipt number has already been used. Please enter a unique number.",

  // Communication errors
  NOTIFICATION_FAILED: "Sale completed but notification failed to send",
  WHATSAPP_DISABLED: "WhatsApp notifications are disabled in settings",
  EMAIL_DISABLED: "Email notifications are disabled in settings",

  // General errors
  NETWORK_ERROR: "Network connection error. Please try again.",
  UNEXPECTED_ERROR: "An unexpected error occurred",
  VALIDATION_ERROR: "Please check your input and try again"
};

export const SUCCESS_MESSAGES = {
  SALE_COMPLETED: "Sale completed successfully!",
  PAYMENT_PROCESSED: "Payment processed successfully",
  NOTIFICATION_SENT: "Notification sent successfully",
  DATA_SAVED: "Data saved successfully",
  SETTINGS_UPDATED: "Settings updated successfully"
};

export const WARNING_MESSAGES = {
  AR_ENTRY_FAILED: "Sale completed but AR entry failed",
  ACCOUNTING_ENTRY_FAILED: "Sale completed but accounting entry failed",
  NOTIFICATION_WARNING: "Sale completed but notification failed to send"
};