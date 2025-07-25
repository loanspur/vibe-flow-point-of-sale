export interface PricingConfig {
  monthlyPrice: number;
  annualDiscountMonths?: number; // Number of months to discount (default: 2)
  annualDiscountPercentage?: number; // Alternative: percentage discount
  currency?: string;
}

export interface CalculatedPricing {
  monthly: {
    price: number;
    period: string;
    displayPrice: string;
  };
  annual: {
    price: number;
    period: string;
    displayPrice: string;
    savings: number;
    savingsDisplay: string;
  };
}

/**
 * Calculate dynamic pricing for monthly and annual plans
 */
export function calculatePricing(config: PricingConfig): CalculatedPricing {
  const { 
    monthlyPrice, 
    annualDiscountMonths = 2, 
    annualDiscountPercentage,
    currency = 'KES'
  } = config;

  let annualPrice: number;
  let savings: number;

  if (annualDiscountPercentage) {
    // Use percentage discount
    annualPrice = (monthlyPrice * 12) * (1 - annualDiscountPercentage / 100);
    savings = (monthlyPrice * 12) - annualPrice;
  } else {
    // Use months discount (pay for X months, get 12 months)
    const payableMonths = 12 - annualDiscountMonths;
    annualPrice = monthlyPrice * payableMonths;
    savings = monthlyPrice * annualDiscountMonths;
  }

  const formatPrice = (price: number) => {
    if (currency === 'KES') {
      return `KES ${price.toLocaleString()}`;
    } else if (currency === 'USD') {
      return `$${price.toLocaleString()}`;
    }
    return `${price.toLocaleString()} ${currency}`;
  };

  return {
    monthly: {
      price: monthlyPrice,
      period: '/month',
      displayPrice: formatPrice(monthlyPrice)
    },
    annual: {
      price: annualPrice,
      period: '/year',
      displayPrice: formatPrice(annualPrice),
      savings,
      savingsDisplay: formatPrice(savings)
    }
  };
}

/**
 * Get pricing display for a specific period
 */
export function getPricingDisplay(
  config: PricingConfig, 
  isAnnual: boolean = false
): { price: string; period: string; savings?: string } {
  const calculated = calculatePricing(config);
  
  if (isAnnual) {
    return {
      price: calculated.annual.displayPrice,
      period: calculated.annual.period,
      savings: `Save ${calculated.annual.savingsDisplay}`
    };
  }
  
  return {
    price: calculated.monthly.displayPrice,
    period: calculated.monthly.period
  };
}

/**
 * Calculate savings percentage for annual plans
 */
export function calculateSavingsPercentage(config: PricingConfig): number {
  const calculated = calculatePricing(config);
  const annualEquivalent = calculated.monthly.price * 12;
  return Math.round((calculated.annual.savings / annualEquivalent) * 100);
}

/**
 * Convert database plan to pricing config
 */
export function planToPricingConfig(plan: any): PricingConfig {
  return {
    monthlyPrice: plan.price || 0,
    annualDiscountMonths: plan.annual_discount_months || 2,
    annualDiscountPercentage: plan.annual_discount_percentage,
    currency: plan.currency || 'KES'
  };
}