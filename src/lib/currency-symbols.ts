/**
 * Comprehensive currency symbol mapping and automatic symbol detection
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCY_SYMBOLS: Record<string, CurrencyInfo> = {
  // Major Currencies
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  
  // African Currencies
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG' },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'en-TZ' },
  RWF: { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc', locale: 'en-RW' },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', locale: 'en-ET' },
  GHS: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', locale: 'en-EG' },
  
  // Other Common Currencies
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'no-NO' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', locale: 'pl-PL' },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', locale: 'cs-CZ' },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', locale: 'hu-HU' },
  
  // Crypto (if needed)
  BTC: { code: 'BTC', symbol: '₿', name: 'Bitcoin', locale: 'en-US' },
  ETH: { code: 'ETH', symbol: 'Ξ', name: 'Ethereum', locale: 'en-US' },
};

/**
 * Get currency symbol from currency code
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  const normalizedCode = currencyCode?.toUpperCase();
  return CURRENCY_SYMBOLS[normalizedCode]?.symbol || currencyCode || '$';
};

/**
 * Get currency info from currency code
 */
export const getCurrencyInfo = (currencyCode: string): CurrencyInfo => {
  const normalizedCode = currencyCode?.toUpperCase();
  return CURRENCY_SYMBOLS[normalizedCode] || {
    code: normalizedCode || 'USD',
    symbol: normalizedCode || '$',
    name: 'Unknown Currency',
    locale: 'en-US'
  };
};

/**
 * Auto-detect and update currency symbol when currency code changes
 */
export const autoUpdateCurrencySymbol = (currencyCode: string): { code: string; symbol: string } => {
  const info = getCurrencyInfo(currencyCode);
  return {
    code: info.code,
    symbol: info.symbol
  };
};

/**
 * Format amount with proper currency symbol and locale
 */
export const formatAmountWithSymbol = (
  amount: number, 
  currencyCode: string, 
  customSymbol?: string
): string => {
  const info = getCurrencyInfo(currencyCode);
  const symbol = customSymbol || info.symbol;
  
  try {
    // Special handling for certain currencies
    if (['KES', 'UGX', 'TZS'].includes(info.code)) {
      return `${symbol} ${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    // Use Intl.NumberFormat for standard currencies
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${symbol} ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
};

/**
 * Get all available currencies for dropdown/selection
 */
export const getAvailableCurrencies = (): CurrencyInfo[] => {
  return Object.values(CURRENCY_SYMBOLS).sort((a, b) => a.name.localeCompare(b.name));
};
