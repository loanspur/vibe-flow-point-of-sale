import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  fromCurrency: string;
  toCurrency: string;
}

interface TenantCurrency {
  currency: string;
  rate: number;
  country: string;
}

export const useCurrencyConversion = () => {
  const { tenantId } = useAuth();
  const [tenantCurrency, setTenantCurrency] = useState<TenantCurrency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tenant's local currency based on their country
  const fetchTenantCurrency = useCallback(async () => {
    // Avoid tenant-specific currency fetch on apex domains before redirect
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isApex = host === 'vibenet.shop' || host === 'www.vibenet.shop' || host === 'vibenet.online' || host === 'www.vibenet.online';
    if (isApex) {
      setLoading(false);
      return;
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: funcError } = await supabase.functions.invoke('currency-conversion', {
        body: {
          action: 'get-tenant-currency',
          tenantId,
        },
      });

      if (funcError) {
        console.error('Error fetching tenant currency:', funcError);
        setError('Failed to fetch currency settings');
        // Fallback to USD
        setTenantCurrency({ currency: 'USD', rate: 0.0062, country: 'Unknown' });
      } else {
        setTenantCurrency(data);
        setError(null);
      }
    } catch (err) {
      console.error('Currency fetch error:', err);
      setError('Failed to fetch currency settings');
      // Fallback to USD
      setTenantCurrency({ currency: 'USD', rate: 0.0062, country: 'Unknown' });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Convert a single amount from KES to tenant's local currency
  const convertFromKES = useCallback(
    async (amount: number): Promise<number> => {
      if (!tenantCurrency) {
        await fetchTenantCurrency();
      }
      
      if (tenantCurrency?.currency === 'KES') {
        return amount;
      }

      try {
        const { data, error: funcError } = await supabase.functions.invoke('currency-conversion', {
          body: {
            action: 'convert',
            amount,
            fromCurrency: 'KES',
            toCurrency: tenantCurrency?.currency || 'USD',
          },
        });

        if (funcError) {
          console.error('Conversion error:', funcError);
          return amount; // Return original amount as fallback
        }

        return data.convertedAmount;
      } catch (err) {
        console.error('Currency conversion error:', err);
        return amount; // Return original amount as fallback
      }
    },
    [tenantCurrency, fetchTenantCurrency]
  );

  // Convert multiple amounts in bulk
  const bulkConvertFromKES = useCallback(
    async (amounts: number[]): Promise<{ original: number; converted: number }[]> => {
      if (!tenantCurrency) {
        await fetchTenantCurrency();
      }

      if (tenantCurrency?.currency === 'KES') {
        return amounts.map(amount => ({ original: amount, converted: amount }));
      }

      try {
        const { data, error: funcError } = await supabase.functions.invoke('currency-conversion', {
          body: {
            action: 'bulk-convert',
            amounts,
            targetCurrency: tenantCurrency?.currency || 'USD',
          },
        });

        if (funcError) {
          console.error('Bulk conversion error:', funcError);
          return amounts.map(amount => ({ original: amount, converted: amount }));
        }

        return data.conversions;
      } catch (err) {
        console.error('Bulk currency conversion error:', err);
        return amounts.map(amount => ({ original: amount, converted: amount }));
      }
    },
    [tenantCurrency, fetchTenantCurrency]
  );

  // Format currency with proper symbol and locale
  const formatLocalCurrency = useCallback(
    (amount: number): string => {
      if (!tenantCurrency) return `KES ${amount.toLocaleString()}`;

      try {
        if (tenantCurrency.currency === 'KES') {
          return `KES ${amount.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}`;
        }

        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: tenantCurrency.currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch (error) {
        // Fallback formatting
        return `${tenantCurrency.currency} ${amount.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
      }
    },
    [tenantCurrency]
  );

  // Get currency symbol only
  const getCurrencySymbol = useCallback((): string => {
    if (!tenantCurrency) return 'KES';
    
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'KES': 'KES',
      'NGN': '₦',
      'ZAR': 'R',
      'UGX': 'USh',
      'TZS': 'TSh',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CNY': '¥',
      'INR': '₹',
      'BRL': 'R$',
    };

    return currencySymbols[tenantCurrency.currency] || tenantCurrency.currency;
  }, [tenantCurrency]);

  useEffect(() => {
    fetchTenantCurrency();
  }, [fetchTenantCurrency]);

  return {
    tenantCurrency,
    loading,
    error,
    convertFromKES,
    bulkConvertFromKES,
    formatLocalCurrency,
    getCurrencySymbol,
    refreshCurrency: fetchTenantCurrency,
  };
};