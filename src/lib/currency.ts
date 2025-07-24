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
 * Get current user's tenant ID
 */
async function getCurrentTenantId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching tenant ID:', error);
      return null;
    }

    return data?.tenant_id || null;
  } catch (error) {
    console.error('Error in getCurrentTenantId:', error);
    return null;
  }
}

/**
 * Get currency settings from business settings for current tenant
 */
export async function getCurrencySettings(): Promise<CurrencySettings> {
  // Check if cache is still valid
  if (currencyCache && Date.now() < cacheExpiry) {
    return currencyCache;
  }

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      // Fallback to USD if no tenant
      return { currency_code: 'USD', currency_symbol: '$' };
    }

    const { data, error } = await supabase
      .from('business_settings')
      .select('currency_code, currency_symbol')
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching currency settings:', error);
      // Fallback to USD if error
      return { currency_code: 'USD', currency_symbol: '$' };
    }

    // Map common currency codes to their symbols if symbol is not set correctly
    const getCurrencySymbol = (code: string, providedSymbol: string): string => {
      if (providedSymbol && providedSymbol !== '$') return providedSymbol;
      
      const currencySymbols: { [key: string]: string } = {
        'USD': '$',
        'KES': 'KSh',
        
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'INR': '₹',
        'NGN': '₦',
        'ZAR': 'R',
        'UGX': 'USh',
        'TZS': 'TSh',
        'RWF': 'RF',
        'ETB': 'Br',
        'GHS': '₵',
        'XOF': 'CFA',
        'XAF': 'CFA',
        'EGP': '£E',
        'MAD': 'DH'
      };
      
      return currencySymbols[code] || code;
    };

    const settings = {
      currency_code: data.currency_code || 'USD',
      currency_symbol: getCurrencySymbol(data.currency_code || 'USD', data.currency_symbol)
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
    // For some currencies like KES, use manual formatting as Intl might not support all locales
    if (currency_code === 'KES') {
      return `${currency_symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency_code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback to manual formatting if currency code is not supported
    return `${currency_symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format currency amount synchronously using cached settings or fallback
 */
export function formatCurrencySync(amount: number, fallbackCurrency?: string, fallbackSymbol?: string): string {
  const currency_code = currencyCache?.currency_code || fallbackCurrency || 'USD';
  const currency_symbol = currencyCache?.currency_symbol || fallbackSymbol || '$';
  
  try {
    // For some currencies like KES, use manual formatting as Intl might not support all locales
    if (currency_code === 'KES') {
      return `${currency_symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency_code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback to manual formatting if currency code is not supported
    return `${currency_symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Clear currency cache (useful when currency settings change)
 */
export function clearCurrencyCache(): void {
  currencyCache = null;
  cacheExpiry = 0;
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

  const refreshSettings = React.useCallback(async () => {
    clearCurrencyCache();
    const newSettings = await getCurrencySettings();
    setSettings(newSettings);
  }, []);

  return { settings, loading, formatAmount, refreshSettings };
}

// Re-export React for the hook
import * as React from 'react';