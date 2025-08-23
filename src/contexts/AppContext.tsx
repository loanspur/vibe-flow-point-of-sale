import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion';
import { autoUpdateCurrencySymbol, formatAmountWithSymbol } from '@/lib/currency-symbols';
import { tabStabilityManager } from '@/lib/tab-stability-manager';
import { useBusinessSettingsManager } from '@/hooks/useBusinessSettingsManager';

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
  currencySymbol: string;
  currencyCode: string;
  triggerCurrencyUpdate: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add error boundary for hook
  let settings, loading, fetchSettings;
  
  try {
    const hookResult = useBusinessSettingsManager();
    settings = hookResult.settings;
    loading = hookResult.loading;
    fetchSettings = hookResult.fetchSettings;
  } catch (error) {
    console.error('Error initializing useBusinessSettingsManager:', error);
    // Fallback values
    settings = null;
    loading = false;
    fetchSettings = () => Promise.resolve();
  }
  
  // Use settings as businessSettings for consistency
  const businessSettings = settings;
  
  // State for currency updates
  const [currencyUpdateTrigger, setCurrencyUpdateTrigger] = useState(0);
  const refreshingRef = useRef(false);
  
  // Mock functions for currency conversion (replace with actual implementation)
  const formatLocalCurrency = useCallback((amount: number): string => {
    return formatAmountWithSymbol(amount, 'KES', 'KSh');
  }, []);

  const convertFromKES = useCallback(async (amount: number): Promise<number> => {
    // Mock conversion - replace with actual API call
    return amount;
  }, []);

  const tenantCurrency = { currency: 'KES' }; // Mock tenant currency

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshBusinessSettings = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await fetchSettings();
      setCurrencyUpdateTrigger(prev => prev + 1);
    } finally {
      refreshingRef.current = false;
    }
  }, [fetchSettings]);

  const triggerCurrencyUpdate = useCallback(() => {
    setCurrencyUpdateTrigger(prev => prev + 1);
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    if (!businessSettings) return formatAmountWithSymbol(amount, 'USD');
    
    return formatAmountWithSymbol(
      amount, 
      businessSettings.currency_code, 
      businessSettings.currency_symbol
    );
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

  // Simplified real-time subscription - only enable if performance allows
  useEffect(() => {
    if (!tenantId) return;

    // Skip realtime updates if performance is prioritized
    const ENABLE_REALTIME = process.env.NODE_ENV === 'development' || window.innerWidth > 768;
    if (!ENABLE_REALTIME) return;

    let timeoutRef: NodeJS.Timeout;

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
        (payload) => {
          // Extended debounce for better performance
          if (timeoutRef) clearTimeout(timeoutRef);
          timeoutRef = setTimeout(() => {
            if (!refreshingRef.current && payload.new) {
              // Trigger a refresh instead of manually setting state
              fetchSettings();
            }
          }, 2000); // Extended to 2 second debounce for better stability
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchSettings]);

  return (
    <AppContext.Provider value={{
      businessSettings,
      loading,
      refreshBusinessSettings,
      formatCurrency,
      formatLocalCurrency,
      convertFromKES,
      tenantCurrency: tenantCurrency?.currency || null,
      currencySymbol: businessSettings?.currency_symbol || '$',
      currencyCode: businessSettings?.currency_code || 'USD',
      triggerCurrencyUpdate
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