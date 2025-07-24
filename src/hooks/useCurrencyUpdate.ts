import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';

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

  return {
    currencySymbol,
    currencyCode,
    formatCurrency,
    updateCounter,
    triggerUpdate: triggerCurrencyUpdate,
    isKES: currencyCode === 'KES' || currencyCode === 'KSH'
  };
};