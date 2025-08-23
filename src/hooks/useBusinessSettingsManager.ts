import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Enhanced logging for debugging
const DEBUG_PREFIX = '[useBusinessSettingsManager]';

// Add this function to detect if the hook is being called without proper import
const detectHookUsage = () => {
  const stack = new Error().stack || '';
  const callerInfo = stack.split('\n')[2] || 'unknown';
  
  console.log(`${DEBUG_PREFIX} Hook called from:`, {
    caller: callerInfo.trim(),
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
  });
};

const simpleErrorHandler = (error: any, context: string) => {
  console.error(`${DEBUG_PREFIX} Error in ${context}:`, error);
  console.error(`${DEBUG_PREFIX} Stack trace:`, new Error().stack);
};

const simpleDebugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${DEBUG_PREFIX} ${message}`, data);
  }
};

// Add hook initialization logging
const logHookInitialization = (tenantId?: string | null) => {
  simpleDebugLog('Hook initialized', { 
    tenantId, 
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
  });
};

// Simple interface without complex dependencies
interface BusinessSettings {
  currency_code: string;
  currency_symbol: string;
  company_name: string;
  timezone: string;
  tax_inclusive: boolean;
  default_tax_rate: number;
  [key: string]: any;
}

export const useBusinessSettingsManager = (tenantId?: string | null) => {
  // Detect hook usage
  detectHookUsage();
  
  // Log hook initialization
  logHookInitialization(tenantId);
  
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    simpleDebugLog('fetchSettings called', { tenantId });
    
    if (!tenantId) {
      simpleDebugLog('No tenantId provided, skipping fetch');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      simpleDebugLog('Fetching settings from database', { tenantId });
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      simpleDebugLog('Settings fetched successfully', { data });
      setSettings(data);
    } catch (error) {
      simpleErrorHandler(error, 'useBusinessSettingsManager.fetchSettings');
      simpleDebugLog('Setting default settings due to error');
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const updateSettings = useCallback(async (updates: Partial<BusinessSettings>) => {
    simpleDebugLog('updateSettings called', { tenantId, updates });
    
    if (!tenantId) {
      simpleDebugLog('No tenantId provided, skipping update');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .upsert({ tenant_id: tenantId, ...updates })
        .select()
        .single();

      if (error) throw error;
      simpleDebugLog('Settings updated successfully', { data });
      setSettings(data);
      return data;
    } catch (error) {
      simpleErrorHandler(error, 'useBusinessSettingsManager.updateSettings');
      throw error;
    }
  }, [tenantId]);

  // Centralized real-time subscription
  useEffect(() => {
    simpleDebugLog('Setting up real-time subscription', { tenantId });
    
    if (!tenantId) {
      simpleDebugLog('No tenantId, skipping real-time subscription');
      return;
    }

    const channel = supabase
      .channel('business-settings-centralized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_settings',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          simpleDebugLog('Real-time update received', payload);
          if (payload.new) {
            setSettings(payload.new);
          }
        }
      )
      .subscribe();

    simpleDebugLog('Real-time subscription established');

    return () => {
      simpleDebugLog('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Initial fetch
  useEffect(() => {
    simpleDebugLog('Initial fetch effect triggered');
    fetchSettings();
  }, [fetchSettings]);

  const result = { 
    settings, 
    loading, 
    fetchSettings, 
    updateSettings 
  };
  
  simpleDebugLog('Hook returning result', { 
    hasSettings: !!settings, 
    loading, 
    tenantId 
  });
  
  return result;
};

// Centralized default settings
const getDefaultSettings = (): BusinessSettings => ({
  currency_code: 'USD',
  currency_symbol: '$',
  company_name: 'Your Business',
  timezone: 'UTC',
  tax_inclusive: false,
  default_tax_rate: 0,
  tax_name: 'Tax',
  country: 'United States',
  
  // POS settings
  pos_auto_print_receipt: true,
  pos_ask_customer_info: false,
  pos_enable_discounts: true,
  pos_max_discount_percent: 100,
  pos_enable_tips: false,
  pos_default_payment_method: 'cash',
  
  // Product settings
  enable_brands: false,
  enable_product_units: true,
  enable_barcode_scanning: true,
  enable_negative_stock: false,
  enable_warranty: false,
  enable_fixed_pricing: false,
  enable_product_expiry: true,
  auto_generate_sku: true,
  enable_retail_pricing: true,
  enable_wholesale_pricing: false,
  enable_combo_products: false,
  default_markup_percentage: 0,
  stock_accounting_method: 'FIFO',
  
  // Inventory settings
  low_stock_threshold: 10,
  low_stock_alerts: true,
  enable_overselling: false,
  enable_multi_location: false,
  
  // Security settings
  max_login_attempts: 3,
  account_lockout_duration: 15,
  session_timeout_minutes: 60,
  require_password_change: false,
  password_expiry_days: 90,
  
  // Document settings
  invoice_auto_number: true,
  quote_auto_number: true,
  delivery_note_auto_number: true,
  quote_validity_days: 30,
  print_customer_copy: true,
  print_merchant_copy: true,
  
  // Communication settings
  sms_enable_notifications: false,
  whatsapp_enable_notifications: false,
  email_notifications: true,
  daily_reports: true,
  
  // Purchase settings
  purchase_default_tax_rate: 0,
  purchase_auto_receive: false,
  purchase_enable_partial_receive: true,
  
  // Business operations
  enable_loyalty_program: false,
  enable_gift_cards: false,
  enable_online_orders: false,
  enable_user_roles: true,
  
  // Templates
  invoice_template: 'standard',
  receipt_template: 'standard',
  quote_template: 'standard',
  delivery_note_template: 'standard',
  invoice_number_prefix: 'INV-',
  quote_number_prefix: 'QT-',
  delivery_note_prefix: 'DN-',
  
  // Email settings
  email_smtp_port: 587,
  email_enable_ssl: true,
  
  // Date format
  date_format: 'MM/DD/YYYY'
});
