import { useMemo } from 'react';
import { calculatePricing, getPricingDisplay, calculateSavingsPercentage, type PricingConfig } from '@/lib/pricingUtils';

export interface UsePricingCalculationProps {
  monthlyPrice: number;
  annualDiscountMonths?: number;
  annualDiscountPercentage?: number;
  currency?: string;
}

export const usePricingCalculation = (config: UsePricingCalculationProps) => {
  const pricingConfig: PricingConfig = useMemo(() => ({
    monthlyPrice: config.monthlyPrice,
    annualDiscountMonths: config.annualDiscountMonths,
    annualDiscountPercentage: config.annualDiscountPercentage,
    currency: config.currency
  }), [config.monthlyPrice, config.annualDiscountMonths, config.annualDiscountPercentage, config.currency]);

  const calculatedPricing = useMemo(() => 
    calculatePricing(pricingConfig), 
    [pricingConfig]
  );

  const savingsPercentage = useMemo(() => 
    calculateSavingsPercentage(pricingConfig), 
    [pricingConfig]
  );

  const getDisplayPrice = (isAnnual: boolean = false) => {
    return getPricingDisplay(pricingConfig, isAnnual);
  };

  const getPrice = (isAnnual: boolean = false) => {
    return isAnnual ? calculatedPricing.annual.price : calculatedPricing.monthly.price;
  };

  const getDisplayPriceFormatted = (isAnnual: boolean = false) => {
    const display = getDisplayPrice(isAnnual);
    return display.price;
  };

  const getPeriod = (isAnnual: boolean = false) => {
    return isAnnual ? calculatedPricing.annual.period : calculatedPricing.monthly.period;
  };

  const getSavings = () => {
    return {
      amount: calculatedPricing.annual.savings,
      percentage: savingsPercentage,
      display: calculatedPricing.annual.savingsDisplay
    };
  };

  return {
    calculatedPricing,
    savingsPercentage,
    getDisplayPrice,
    getPrice,
    getDisplayPriceFormatted,
    getPeriod,
    getSavings,
    // Legacy compatibility functions
    formatPrice: (price: number) => `KES ${price.toLocaleString()}`,
    getDisplayPeriod: getPeriod
  };
};