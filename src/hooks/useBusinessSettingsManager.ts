import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { handleError } from '@/utils/errorHandler';
import { debugLog } from '@/utils/debug';

export const useBusinessSettingsManager = () => {
  const { tenantId } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*') // Select all fields to support all components
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      handleError(error, 'useBusinessSettingsManager');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const updateSettings = useCallback(async (updates: any) => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .upsert({ tenant_id: tenantId, ...updates })
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
      return data;
    } catch (error) {
      handleError(error, 'useBusinessSettingsManager.updateSettings');
      throw error;
    }
  }, [tenantId]);

  // Centralized real-time subscription
  useEffect(() => {
    if (!tenantId) return;

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
          debugLog('Business settings updated, refreshing...');
          if (payload.new) {
            setSettings(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return { settings, loading, fetchSettings, updateSettings };
};

// Centralized default settings
const getDefaultSettings = () => ({
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
