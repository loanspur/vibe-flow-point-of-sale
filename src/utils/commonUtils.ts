import { useApp } from '@/contexts/AppContext';

// Stock formatting utility to handle floating-point precision issues
export const formatStockQuantity = (quantity: number | null | undefined): string => {
  if (quantity === null || quantity === undefined) return '0';
  
  // Round to 2 decimal places to handle floating-point precision issues
  const rounded = Math.round((quantity + Number.EPSILON) * 100) / 100;
  
  // If the number is a whole number, display without decimals
  if (rounded % 1 === 0) {
    return rounded.toString();
  }
  
  // Otherwise, display with up to 2 decimal places
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

// Common validation functions
export const validateQuantity = (quantity: number): { isValid: boolean; error?: string } => {
  if (quantity <= 0) {
    return { isValid: false, error: "Please enter a valid quantity greater than 0" };
  }
  return { isValid: true };
};

export const validateLocation = (locationId: string): { isValid: boolean; error?: string } => {
  if (!locationId) {
    return { isValid: false, error: "Please select a location" };
  }
  return { isValid: true };
};

export const validateProduct = (productId: string): { isValid: boolean; error?: string } => {
  if (!productId) {
    return { isValid: false, error: "Please select a valid product" };
  }
  return { isValid: true };
};

// Common price calculation functions
export const calculateTotalPrice = (unitPrice: number, quantity: number): number => {
  return unitPrice * quantity;
};

export const calculateSubtotal = (items: Array<{ total_price: number }>): number => {
  return items.reduce((sum, item) => sum + item.total_price, 0);
};

export const calculateTotal = (
  subtotal: number,
  discount: number = 0,
  tax: number = 0,
  shipping: number = 0,
  isTaxInclusive: boolean = false
): number => {
  if (isTaxInclusive) {
    // Tax is already included in prices
    return subtotal - discount + shipping;
  } else {
    // Tax is added to the total
    return subtotal - discount + tax + shipping;
  }
};

// Common stock validation functions
export const validateStockAvailability = (
  currentStock: number,
  requestedQuantity: number,
  allowNegativeStock: boolean = false,
  allowOverselling: boolean = false
): { isValid: boolean; error?: string; warning?: string } => {
  if (!allowNegativeStock && !allowOverselling && currentStock < requestedQuantity) {
    return {
      isValid: false,
      error: `Insufficient stock. Only ${currentStock} available but ${requestedQuantity} requested.`
    };
  }

  if (allowOverselling && currentStock < requestedQuantity) {
    return {
      isValid: true,
      warning: `Warning: Requesting ${requestedQuantity} units but only ${currentStock} available. This will result in negative stock.`
    };
  }

  return { isValid: true };
};

// Common customer validation functions
export const validateCustomerCredit = (
  customer: any,
  totalAmount: number
): { isValid: boolean; error?: string; warning?: string } => {
  if (!customer || customer.id === 'walk-in') {
    return { isValid: true };
  }

  if (!customer.credit_limit || customer.credit_limit <= 0) {
    return { isValid: true };
  }

  const availableCredit = customer.credit_limit - (customer.current_credit_balance || 0);
  
  if (totalAmount > availableCredit) {
    return {
      isValid: false,
      error: `Sale amount (${totalAmount}) exceeds available credit (${availableCredit})`
    };
  }

  const creditUsagePercentage = ((customer.current_credit_balance || 0) / customer.credit_limit) * 100;
  if (creditUsagePercentage >= 80) {
    return {
      isValid: true,
      warning: `Customer has used ${creditUsagePercentage.toFixed(1)}% of their credit limit`
    };
  }

  return { isValid: true };
};

// Common formatting functions
export const formatCurrency = (amount: number): string => {
  const { formatCurrency } = useApp();
  return formatCurrency(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Common search and filter functions
export const filterBySearchTerm = <T extends Record<string, any>>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] => {
  if (!searchTerm.trim()) return items;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      return value && value.toString().toLowerCase().includes(lowerSearchTerm);
    })
  );
};

export const paginateItems = <T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; totalPages: number; totalItems: number } => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: items.slice(startIndex, endIndex),
    totalPages,
    totalItems
  };
};

// Common status functions
export const getStockStatus = (currentStock: number, minLevel: number = 0) => {
  if (currentStock <= 0) return { label: 'Out of Stock', color: 'bg-red-500', variant: 'destructive' as const };
  if (currentStock <= minLevel) return { label: 'Low Stock', color: 'bg-yellow-500', variant: 'default' as const };
  return { label: 'In Stock', color: 'bg-green-500', variant: 'secondary' as const };
};

export const getPaymentStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return { label: 'Completed', color: 'bg-green-500', variant: 'secondary' as const };
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-500', variant: 'default' as const };
    case 'failed':
      return { label: 'Failed', color: 'bg-red-500', variant: 'destructive' as const };
    default:
      return { label: 'Unknown', color: 'bg-gray-500', variant: 'outline' as const };
  }
};

// Common generation functions
export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateReceiptNumber = (): string => {
  return `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
};

export const generateQuoteNumber = (): string => {
  return `QUO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
};

export const generateInvoiceNumber = (): string => {
  return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
};

// Common debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Common throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
