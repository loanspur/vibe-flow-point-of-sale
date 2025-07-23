import { supabase } from "@/integrations/supabase/client";

interface CurrencySettings {
  currency_code: string;
  currency_symbol: string;
}

// Cache for currency settings to avoid repeated database calls
let currencyCache: CurrencySettings | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get currency settings from business settings
 */
export async function getCurrencySettings(): Promise<CurrencySettings> {
  // Check if cache is still valid
  if (currencyCache && Date.now() < cacheExpiry) {
    return currencyCache;
  }

  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('currency_code, currency_symbol')
      .single();

    if (error) {
      console.error('Error fetching currency settings:', error);
      // Fallback to USD if error
      return { currency_code: 'USD', currency_symbol: '$' };
    }

    const settings = {
      currency_code: data.currency_code || 'USD',
      currency_symbol: data.currency_symbol || '$'
    };

    // Update cache
    currencyCache = settings;
    cacheExpiry = Date.now() + CACHE_DURATION;

    return settings;
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    return { currency_code: 'USD', currency_symbol: '$' };
  }
}

/**
 * Format currency amount using business settings
 */
export async function formatCurrency(amount: number): Promise<string> {
  const { currency_code, currency_symbol } = await getCurrencySettings();
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency_code
    }).format(amount);
  } catch (error) {
    // Fallback to manual formatting if currency code is not supported
    return `${currency_symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format currency amount synchronously using cached settings or fallback
 */
export function formatCurrencySync(amount: number, fallbackCurrency?: string, fallbackSymbol?: string): string {
  const currency_code = currencyCache?.currency_code || fallbackCurrency || 'USD';
  const currency_symbol = currencyCache?.currency_symbol || fallbackSymbol || '$';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency_code
    }).format(amount);
  } catch (error) {
    // Fallback to manual formatting if currency code is not supported
    return `${currency_symbol}${amount.toFixed(2)}`;
  }
}

/**
 * React hook to get currency settings
 */
export function useCurrencySettings() {
  const [settings, setSettings] = React.useState<CurrencySettings>({ 
    currency_code: 'USD', 
    currency_symbol: '$' 
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getCurrencySettings().then(settings => {
      setSettings(settings);
      setLoading(false);
    });
  }, []);

  const formatAmount = React.useCallback((amount: number) => {
    return formatCurrencySync(amount, settings.currency_code, settings.currency_symbol);
  }, [settings]);

  return { settings, loading, formatAmount };
}

// Re-export React for the hook
import * as React from 'react';