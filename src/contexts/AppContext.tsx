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
  const { settings, loading, fetchSettings } = useBusinessSettingsManager();
  
  // Remove the existing fetchBusinessSettings and real-time subscription logic
  // Use the centralized manager instead
  
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshBusinessSettings = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await fetchBusinessSettings();
      setCurrencyUpdateTrigger(prev => prev + 1);
    } finally {
      refreshingRef.current = false;
    }
  }, [fetchBusinessSettings]);

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

  useEffect(() => {
    fetchBusinessSettings();
  }, [fetchBusinessSettings]);

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
              const newSettings = payload.new as any;
              
              // Auto-detect currency symbol if needed
              let currencySymbol = newSettings.currency_symbol;
              if (newSettings.currency_code && !currencySymbol) {
                const autoDetected = autoUpdateCurrencySymbol(newSettings.currency_code);
                currencySymbol = autoDetected.symbol;
              }
              
              setBusinessSettings({
                currency_code: newSettings.currency_code || 'USD',
                currency_symbol: currencySymbol || '$',
                company_name: newSettings.company_name || 'Your Business',
                timezone: newSettings.timezone || 'UTC',
                tax_inclusive: newSettings.tax_inclusive || false,
                default_tax_rate: newSettings.default_tax_rate || 0
              });
            }
          }, 2000); // Extended to 2 second debounce for better stability
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Remove the problematic auth readiness check - AuthContext should always be available

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