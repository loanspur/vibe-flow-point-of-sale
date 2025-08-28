import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [currencyCache, setCurrencyCache] = useState<{ symbol: string; code: string } | null>(null);
  const [cacheExpiry, setCacheExpiry] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user, tenantId } = useAuth();
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Simplified fetchBusinessSettings - no heavy operations
  const fetchBusinessSettings = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching business settings:', error);
        return;
      }

      if (data) {
        setBusinessSettings(data);
        
        // Update currency cache
        const currencyInfo = {
          symbol: data.currency_symbol || '$',
          code: data.currency_code || 'USD'
        };
        setCurrencyCache(currencyInfo);
        setCacheExpiry(Date.now() + CACHE_DURATION);
      }
    } catch (error) {
      console.error('Error in fetchBusinessSettings:', error);
    }
  }, [tenantId]);

  // COMPLETELY DISABLED: Real-time business settings updates
  useEffect(() => {
    if (!tenantId) return;

    // Disable all real-time subscriptions to prevent refresh triggers
    console.log('Real-time business settings updates disabled to prevent currency switching');
    
    // Only fetch once on mount - no real-time updates
    fetchBusinessSettings();
  }, [tenantId, fetchBusinessSettings]);

  // Simplified formatCurrency function
  const formatCurrency = useCallback((amount: number): string => {
    const symbol = currencyCache?.symbol || businessSettings?.currency_symbol || '$';
    const code = currencyCache?.code || businessSettings?.currency_code || 'USD';
    
    // Use cached currency info for better performance
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currencyCache, businessSettings]);

  // Simplified context value
  const contextValue = useMemo(() => ({
    businessSettings,
    formatCurrency,
    fetchBusinessSettings,
    isLoading,
  }), [businessSettings, formatCurrency, fetchBusinessSettings, isLoading]);

  return (
    <AppContext.Provider value={contextValue}>
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