import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getCurrencySymbol, getCurrencyInfo, formatAmountWithSymbol } from '@/lib/currency-symbols';

/**
 * Custom hook for components that need to automatically respond to currency changes
 * Returns currency information and triggers re-renders when currency updates
 */
export const useCurrencyUpdate = () => {
  const { 
    currencySymbol, 
    currencyCode, 
    formatCurrency, 
    businessSettings,
    triggerCurrencyUpdate 
  } = useApp();
  
  const [updateCounter, setUpdateCounter] = useState(0);

  // Trigger re-render when currency settings change
  useEffect(() => {
    setUpdateCounter(prev => prev + 1);
  }, [currencySymbol, currencyCode, businessSettings?.currency_code, businessSettings?.currency_symbol]);

  // Get enhanced currency info
  const currencyInfo = getCurrencyInfo(currencyCode);
  const autoDetectedSymbol = getCurrencySymbol(currencyCode);

  return {
    currencySymbol,
    currencyCode,
    formatCurrency,
    updateCounter,
    triggerUpdate: triggerCurrencyUpdate,
    isKES: currencyCode === 'KES' || currencyCode === 'KSH',
    currencyInfo,
    autoDetectedSymbol,
    formatAmount: (amount: number) => formatAmountWithSymbol(amount, currencyCode, currencySymbol),
    // Quick formatters for common use cases
    formatPrice: (price: number) => formatAmountWithSymbol(price, currencyCode, currencySymbol),
    formatTotal: (total: number) => formatAmountWithSymbol(total, currencyCode, currencySymbol)
  };
};