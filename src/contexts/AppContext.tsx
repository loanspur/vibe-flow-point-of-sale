import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion';
import { autoUpdateCurrencySymbol, formatAmountWithSymbol } from '@/lib/currency-symbols';
import { tabStabilityManager } from '@/lib/tab-stability-manager';

interface BusinessSettings {
  // Basic company information
  currency_code: string;
  currency_symbol: string;
  company_name: string;
  timezone: string;
  tax_inclusive: boolean;
  default_tax_rate: number;
  
  // Product and inventory features
  enable_brands?: boolean;
  enable_overselling?: boolean;
  enable_product_units?: boolean;
  enable_product_expiry?: boolean;
  enable_warranty?: boolean;
  enable_fixed_pricing?: boolean;
  auto_generate_sku?: boolean;
  enable_barcode_scanning?: boolean;
  enable_negative_stock?: boolean;
  stock_accounting_method?: string;
  default_markup_percentage?: number;
  enable_retail_pricing?: boolean;
  enable_wholesale_pricing?: boolean;
  enable_combo_products?: boolean;
  
  // Inventory and stock management
  low_stock_threshold?: number;
  low_stock_alerts?: boolean;
  
  // POS settings
  pos_auto_print_receipt?: boolean;
  pos_ask_customer_info?: boolean;
  pos_enable_discounts?: boolean;
  pos_max_discount_percent?: number;
  
  // Additional fields for backward compatibility
  [key: string]: any;
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
  const refreshingRef = useRef(false);
  
  // Use AuthContext directly - it should always be available since we're wrapped by AuthProvider
  const { tenantId, user } = useAuth();

  const fetchBusinessSettings = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    // Apply homepage stability - prevent business settings fetch during tab switching
    if (tabStabilityManager.shouldPreventQueryRefresh()) {
      return;
    }

    try {
      setLoading(true);
      
      const fetchOnce = () =>
        supabase
          .from('business_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle();

      let settingsResponse = await fetchOnce();

      if (settingsResponse.error && (settingsResponse.error.code === '42501' || settingsResponse.error.message?.toLowerCase().includes('row-level security') || settingsResponse.error.message?.toLowerCase().includes('permission denied'))) {
        try {
          if (user?.email) {
            await supabase.rpc('reactivate_tenant_membership', {
              tenant_id_param: tenantId,
              target_email_param: user.email,
            });
            // Retry once after repair
            settingsResponse = await fetchOnce();
          }
        } catch (e) {
          // ignore
        }
      }

      if (settingsResponse.error && settingsResponse.error.code !== 'PGRST116') {
        console.error('Error fetching business settings:', settingsResponse.error);
        // Use default fallback settings
        setBusinessSettings({
          currency_code: 'USD',
          currency_symbol: '$',
          company_name: 'Your Business',
          timezone: 'UTC',
          tax_inclusive: false,
          default_tax_rate: 0,
          // Product settings defaults
          enable_brands: false,
          enable_overselling: false,
          enable_product_units: true,
          enable_product_expiry: true,
          enable_warranty: false,
          enable_fixed_pricing: false,
          auto_generate_sku: true,
          enable_barcode_scanning: true,
          enable_negative_stock: false,
          stock_accounting_method: 'FIFO',
          default_markup_percentage: 0,
          enable_retail_pricing: true,
          enable_wholesale_pricing: false,
          enable_combo_products: false,
          low_stock_threshold: 10,
          low_stock_alerts: true,
          // POS settings defaults
          pos_auto_print_receipt: true,
          pos_ask_customer_info: false,
          pos_enable_discounts: true,
          pos_max_discount_percent: 100
        });
      } else if (!settingsResponse.data) {
        // No settings found for tenant, use sensible defaults
        setBusinessSettings({
          currency_code: 'USD',
          currency_symbol: '$',
          company_name: 'Your Business',
          timezone: 'UTC',
          tax_inclusive: false,
          default_tax_rate: 0,
          // Product settings defaults
          enable_brands: false,
          enable_overselling: false,
          enable_product_units: true,
          enable_product_expiry: true,
          enable_warranty: false,
          enable_fixed_pricing: false,
          auto_generate_sku: true,
          enable_barcode_scanning: true,
          enable_negative_stock: false,
          stock_accounting_method: 'FIFO',
          default_markup_percentage: 0,
          enable_retail_pricing: true,
          enable_wholesale_pricing: false,
          enable_combo_products: false,
          low_stock_threshold: 10,
          low_stock_alerts: true,
          // POS settings defaults
          pos_auto_print_receipt: true,
          pos_ask_customer_info: false,
          pos_enable_discounts: true,
          pos_max_discount_percent: 100
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
                default_tax_rate: newSettings.default_tax_rate || 0,
                // Product settings
                enable_brands: newSettings.enable_brands ?? false,
                enable_overselling: newSettings.enable_overselling ?? false,
                enable_product_units: newSettings.enable_product_units ?? true,
                enable_product_expiry: newSettings.enable_product_expiry ?? true,
                enable_warranty: newSettings.enable_warranty ?? false,
                enable_fixed_pricing: newSettings.enable_fixed_pricing ?? false,
                auto_generate_sku: newSettings.auto_generate_sku ?? true,
                enable_barcode_scanning: newSettings.enable_barcode_scanning ?? true,
                enable_negative_stock: newSettings.enable_negative_stock ?? false,
                stock_accounting_method: newSettings.stock_accounting_method ?? 'FIFO',
                default_markup_percentage: newSettings.default_markup_percentage ?? 0,
                enable_retail_pricing: newSettings.enable_retail_pricing ?? true,
                enable_wholesale_pricing: newSettings.enable_wholesale_pricing ?? false,
                enable_combo_products: newSettings.enable_combo_products ?? false,
                low_stock_threshold: newSettings.low_stock_threshold ?? 10,
                low_stock_alerts: newSettings.low_stock_alerts ?? true,
                // POS settings
                pos_auto_print_receipt: newSettings.pos_auto_print_receipt ?? true,
                pos_ask_customer_info: newSettings.pos_ask_customer_info ?? false,
                pos_enable_discounts: newSettings.pos_enable_discounts ?? true,
                pos_max_discount_percent: newSettings.pos_max_discount_percent ?? 100,
                // Include all other fields from the database
                ...newSettings
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