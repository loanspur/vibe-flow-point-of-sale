import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion';

interface BusinessSettings {
  currency_code: string;
  currency_symbol: string;
  company_name: string;
  timezone: string;
  tax_inclusive: boolean;
  default_tax_rate: number;
}

interface AppContextType {
  businessSettings: BusinessSettings | null;
  loading: boolean;
  refreshBusinessSettings: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatLocalCurrency: (amount: number) => string;
  convertFromKES: (amount: number) => Promise<number>;
  tenantCurrency: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantId } = useAuth();
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatLocalCurrency, convertFromKES, tenantCurrency } = useCurrencyConversion();

  const fetchBusinessSettings = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const settingsResponse = await supabase
        .from('business_settings')
        .select('currency_code, currency_symbol, company_name, timezone, tax_inclusive, default_tax_rate')
        .eq('tenant_id', tenantId)
        .single();

      if (settingsResponse.error) {
        console.error('Error fetching business settings:', settingsResponse.error);
        // Use default fallback settings
        setBusinessSettings({
          currency_code: 'USD',
          currency_symbol: '$',
          company_name: 'Your Business',
          timezone: 'UTC',
          tax_inclusive: false,
          default_tax_rate: 0
        });
      } else {
        // Use the actual business settings from the database
        setBusinessSettings(settingsResponse.data);
      }
    } catch (error) {
      console.error('Error in fetchBusinessSettings:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const refreshBusinessSettings = useCallback(async () => {
    await fetchBusinessSettings();
  }, [fetchBusinessSettings]);

  const formatCurrency = useCallback((amount: number): string => {
    if (!businessSettings) return `$${amount.toFixed(2)}`;
    
    try {
      if (businessSettings.currency_code === 'KES' || businessSettings.currency_code === 'KSH') {
        return `${businessSettings.currency_symbol} ${amount.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
      }
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: businessSettings.currency_code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${businessSettings.currency_symbol} ${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
  }, [businessSettings]);

  // Format currency using local conversion
  const formatCurrencyWithConversion = useCallback(async (amount: number): Promise<string> => {
    if (!tenantCurrency) {
      return formatCurrency(amount);
    }
    
    try {
      const convertedAmount = await convertFromKES(amount);
      return formatLocalCurrency(convertedAmount);
    } catch (error) {
      return formatCurrency(amount);
    }
  }, [tenantCurrency, convertFromKES, formatLocalCurrency, formatCurrency]);

  useEffect(() => {
    fetchBusinessSettings();
  }, [fetchBusinessSettings]);

  // Set up real-time subscription for business settings changes
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('business-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_settings',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          refreshBusinessSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, refreshBusinessSettings]);

  return (
    <AppContext.Provider value={{
      businessSettings,
      loading,
      refreshBusinessSettings,
      formatCurrency,
      formatLocalCurrency,
      convertFromKES,
      tenantCurrency: tenantCurrency?.currency || null
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};