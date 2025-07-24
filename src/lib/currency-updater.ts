import { supabase } from '@/integrations/supabase/client';
import { autoUpdateCurrencySymbol } from './currency-symbols';

/**
 * Auto-update currency symbol when currency code changes in business settings
 */
export const handleCurrencyCodeChange = async (
  currencyCode: string,
  tenantId: string,
  updateForm?: (symbol: string) => void
): Promise<string> => {
  const { symbol } = autoUpdateCurrencySymbol(currencyCode);
  
  // Update form if callback provided
  if (updateForm) {
    updateForm(symbol);
  }
  
  // Update database
  try {
    await supabase
      .from('business_settings')
      .update({ 
        currency_code: currencyCode,
        currency_symbol: symbol 
      })
      .eq('tenant_id', tenantId);
    
    console.log(`Auto-updated currency: ${currencyCode} -> ${symbol}`);
  } catch (error) {
    console.error('Error updating currency symbol:', error);
  }
  
  return symbol;
};

/**
 * Batch update currency settings
 */
export const updateCurrencySettings = async (
  tenantId: string,
  currencyCode: string,
  customSymbol?: string
): Promise<{ code: string; symbol: string }> => {
  const finalSymbol = customSymbol || autoUpdateCurrencySymbol(currencyCode).symbol;
  
  try {
    await supabase
      .from('business_settings')
      .update({ 
        currency_code: currencyCode,
        currency_symbol: finalSymbol 
      })
      .eq('tenant_id', tenantId);
    
    return { code: currencyCode, symbol: finalSymbol };
  } catch (error) {
    console.error('Error updating currency settings:', error);
    throw error;
  }
};