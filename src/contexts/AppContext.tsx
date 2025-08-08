import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion';
import { autoUpdateCurrencySymbol, formatAmountWithSymbol } from '@/lib/currency-symbols';

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
  // Always call hooks in the same order
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencyUpdateTrigger, setCurrencyUpdateTrigger] = useState(0);
  const { formatLocalCurrency, convertFromKES, tenantCurrency } = useCurrencyConversion();
  
  // Use AuthContext directly - it should always be available since we're wrapped by AuthProvider
  const { tenantId } = useAuth();

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
        .maybeSingle();

      if (settingsResponse.error && settingsResponse.error.code !== 'PGRST116') {
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
      } else if (!settingsResponse.data) {
        // No settings found for tenant, use sensible defaults
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
    setCurrencyUpdateTrigger(prev => prev + 1);
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
        (payload) => {
          console.log('Business settings changed:', payload);
          // Immediately update with new data if available
          if (payload.new && typeof payload.new === 'object') {
            const newSettings = payload.new as any;
            
            // Auto-detect currency symbol if only currency code was changed
            let currencySymbol = newSettings.currency_symbol;
            if (newSettings.currency_code && !currencySymbol) {
              const autoDetected = autoUpdateCurrencySymbol(newSettings.currency_code);
              currencySymbol = autoDetected.symbol;
            }
            
            const updatedSettings = {
              currency_code: newSettings.currency_code || 'USD',
              currency_symbol: currencySymbol || '$',
              company_name: newSettings.company_name || 'Your Business',
              timezone: newSettings.timezone || 'UTC',
              tax_inclusive: newSettings.tax_inclusive || false,
              default_tax_rate: newSettings.default_tax_rate || 0
            };
            
            setBusinessSettings(updatedSettings);
            
            // Auto-update symbol in database if it was auto-detected
            if (newSettings.currency_code && !newSettings.currency_symbol && currencySymbol !== '$') {
              supabase
                .from('business_settings')
                .update({ currency_symbol: currencySymbol })
                .eq('tenant_id', tenantId)
                .then(() => console.log('Auto-updated currency symbol:', currencySymbol));
            }
          }
          // Also refresh to ensure consistency
          refreshBusinessSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
   }, [tenantId, refreshBusinessSettings]);

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