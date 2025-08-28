import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatAmountWithSymbol, getCurrencySymbol } from '@/lib/currency-symbols';


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

// Stable currency cache to prevent switching
let currencyCache: { code: string; symbol: string } | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencyUpdateTrigger, setCurrencyUpdateTrigger] = useState(0);
  const refreshingRef = useRef(false);
  const settingsFetchedRef = useRef(false);
  
  const { tenantId, user } = useAuth();

  const fetchBusinessSettings = useCallback(async () => {
    if (!tenantId || settingsFetchedRef.current) {
      setLoading(false);
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

      let finalSettings: BusinessSettings;

      if (settingsResponse.error && settingsResponse.error.code !== 'PGRST116') {
        console.error('Error fetching business settings:', settingsResponse.error);
        // Use default fallback settings
        finalSettings = {
          currency_code: 'USD',
          currency_symbol: getCurrencySymbol('USD'),
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
        };
      } else if (!settingsResponse.data) {
        // No settings found for tenant, use sensible defaults
        finalSettings = {
          currency_code: 'USD',
          currency_symbol: getCurrencySymbol('USD'),
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
        };
      } else {
        // Use the actual business settings from the database
        finalSettings = settingsResponse.data;
      }

      // Cache currency settings to prevent switching
      if (finalSettings.currency_code && finalSettings.currency_symbol) {
        currencyCache = {
          code: finalSettings.currency_code,
          symbol: finalSettings.currency_symbol
        };
        cacheExpiry = Date.now() + CACHE_DURATION;
      }

      setBusinessSettings(finalSettings);
      settingsFetchedRef.current = true;
    } catch (error) {
      console.error('Error in fetchBusinessSettings:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.email]);

  const triggerCurrencyUpdate = useCallback(() => {
    setCurrencyUpdateTrigger(prev => prev + 1);
  }, []);

  // Manual refresh function for business settings and currency
  const refreshBusinessSettings = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    
    try {
      settingsFetchedRef.current = false; // Allow re-fetch
      await fetchBusinessSettings();
      triggerCurrencyUpdate();
    } catch (error) {
      console.error('Error refreshing business settings:', error);
    } finally {
      refreshingRef.current = false;
    }
  }, [fetchBusinessSettings, triggerCurrencyUpdate]);

  // Stable currency formatting that uses cached values
  const formatCurrency = useCallback((amount: number): string => {
    // Use cached currency settings if available and valid
    if (currencyCache && Date.now() < cacheExpiry) {
      return formatAmountWithSymbol(
        amount, 
        currencyCache.code, 
        currencyCache.symbol
      );
    }
    
    // Fallback to business settings
    if (!businessSettings) {
      return formatAmountWithSymbol(amount, 'USD', '$');
    }
    
    return formatAmountWithSymbol(
      amount, 
      businessSettings.currency_code, 
      businessSettings.currency_symbol || getCurrencySymbol(businessSettings.currency_code)
    );
  }, [businessSettings]);

  // Format local currency using business settings directly - no conversion needed
  const formatLocalCurrency = useCallback((amount: number): string => {
    return formatCurrency(amount);
  }, [formatCurrency]);

  // No conversion needed - use business settings currency directly
  const convertFromKES = useCallback(async (amount: number): Promise<number> => {
    return amount; // No conversion, return as-is
  }, []);

  useEffect(() => {
    fetchBusinessSettings();
  }, [fetchBusinessSettings]);

  // Completely disable real-time updates to prevent currency switching
  useEffect(() => {
    if (!tenantId) return;
    
    // Real-time updates are completely disabled to prevent currency switching
    console.log('Real-time business settings updates disabled to prevent currency switching');
  }, [tenantId]);

  // Get stable currency values
  const getStableCurrencyCode = (): string => {
    if (currencyCache && Date.now() < cacheExpiry) {
      return currencyCache.code;
    }
    return businessSettings?.currency_code || 'USD';
  };

  const getStableCurrencySymbol = (): string => {
    if (currencyCache && Date.now() < cacheExpiry) {
      return currencyCache.symbol;
    }
    return businessSettings?.currency_symbol || getCurrencySymbol(businessSettings?.currency_code || 'USD');
  };

  return (
    <AppContext.Provider value={{
      businessSettings,
      loading,
      refreshBusinessSettings,
      formatCurrency,
      formatLocalCurrency,
      convertFromKES,
      tenantCurrency: getStableCurrencyCode(),
      currencySymbol: getStableCurrencySymbol(),
      currencyCode: getStableCurrencyCode(),
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