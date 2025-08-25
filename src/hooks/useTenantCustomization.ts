import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TenantCustomization {
  id: string;
  tenant_id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  receipt_template: string;
  invoice_template: string;
  footer_text: string;
  show_stock_alerts: boolean;
  show_low_stock_warnings: boolean;
  default_currency: string;
  date_format: string;
  time_format: '12h' | '24h';
  receipt_header?: string;
  receipt_footer?: string;
  include_tax_breakdown: boolean;
  include_payment_method: boolean;
  created_at: string;
  updated_at: string;
}

interface UseTenantCustomizationReturn {
  customization: TenantCustomization | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateCustomization: (updates: Partial<TenantCustomization>) => Promise<void>;
}

export function useTenantCustomization(): UseTenantCustomizationReturn {
  const [customization, setCustomization] = useState<TenantCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomization = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase.rpc('get_tenant_customization');
      
      if (fetchError) throw fetchError;
      
      if (data && data.length > 0) {
        setCustomization(data[0] as TenantCustomization);
      } else {
        // Set default values if no customization exists
        setCustomization({
          id: '',
          tenant_id: '',
          logo_url: undefined,
          primary_color: '#2563eb',
          secondary_color: '#64748b',
          accent_color: '#f59e0b',
          receipt_template: 'Thank you for your purchase!',
          invoice_template: 'Please pay within 30 days.',
          footer_text: 'Powered by Vibe POS',
          show_stock_alerts: true,
          show_low_stock_warnings: true,
          default_currency: 'KES',
          date_format: 'DD/MM/YYYY',
          time_format: '24h',
          receipt_header: undefined,
          receipt_footer: undefined,
          include_tax_breakdown: true,
          include_payment_method: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching tenant customization:', err);
      setError('Failed to load customization settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomization();
  }, []);

  const updateCustomization = async (updates: Partial<TenantCustomization>) => {
    if (!customization) return;

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('tenant_customization')
        .upsert({
          ...customization,
          ...updates,
        });

      if (updateError) throw updateError;

      // Refresh the customization data
      await fetchCustomization();
    } catch (err) {
      console.error('Error updating tenant customization:', err);
      setError('Failed to update customization settings');
      throw err;
    }
  };

  const refresh = async () => {
    setIsLoading(true);
    await fetchCustomization();
  };

  return {
    customization,
    isLoading,
    error,
    refresh,
    updateCustomization,
  };
}

// Convenience hook for getting specific customization values
export function useCustomizationValue<T extends keyof TenantCustomization>(
  key: T
): TenantCustomization[T] | undefined {
  const { customization } = useTenantCustomization();
  return customization?.[key];
}

// Hook for getting brand colors
export function useBrandColors() {
  const { customization } = useTenantCustomization();
  
  return {
    primary: customization?.primary_color || '#2563eb',
    secondary: customization?.secondary_color || '#64748b',
    accent: customization?.accent_color || '#f59e0b',
  };
}

// Hook for getting receipt settings
export function useReceiptSettings() {
  const { customization } = useTenantCustomization();
  
  return {
    template: customization?.receipt_template || 'Thank you for your purchase!',
    header: customization?.receipt_header,
    footer: customization?.receipt_footer,
    includeTaxBreakdown: customization?.include_tax_breakdown ?? true,
    includePaymentMethod: customization?.include_payment_method ?? true,
  };
}

// Hook for getting UI preferences
export function useUIPreferences() {
  const { customization } = useTenantCustomization();
  
  return {
    showStockAlerts: customization?.show_stock_alerts ?? true,
    showLowStockWarnings: customization?.show_low_stock_warnings ?? true,
    defaultCurrency: customization?.default_currency || 'KES',
    dateFormat: customization?.date_format || 'DD/MM/YYYY',
    timeFormat: customization?.time_format || '24h',
  };
}
