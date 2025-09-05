// Currency constants and utilities
export const CURRENCY_CONFIG = {
  DEFAULT_CURRENCY: 'KES',
  DEFAULT_LOCALE: 'en-KE',
  FALLBACK_CURRENCY: 'USD',
  FALLBACK_LOCALE: 'en-US',
} as const;

// Currency formatting function
export const formatCurrency = (amount: number, currency: string = CURRENCY_CONFIG.DEFAULT_CURRENCY): string => {
  const locale = currency === 'KES' ? CURRENCY_CONFIG.DEFAULT_LOCALE : CURRENCY_CONFIG.FALLBACK_LOCALE;
  
  try {
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  } catch (error) {
    // Fallback to simple formatting
    return `${currency} ${amount.toFixed(2)}`;
  }
};

// Fallback currency formatter for when context is not available
export const fallbackCurrencyFormatter = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Currency symbols
export const CURRENCY_SYMBOLS = {
  KES: 'KSh',
  USD: '$',
  EUR: '€',
  GBP: '£',
} as const;
