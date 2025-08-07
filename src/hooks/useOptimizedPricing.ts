import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: any;
  badge?: string;
  badge_color?: string;
  customers: number;
  pricing?: any;
}

// In-memory cache for billing plans - cleared to show updated features
let cachedPlans: BillingPlan[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute for faster updates

export const useOptimizedPricing = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [convertedPrices, setConvertedPrices] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const { user } = useAuth();

  // Convert KES prices to USD for public visitors
  const convertPricesToUSD = async (plans: BillingPlan[]) => {
    if (user) return; // Skip conversion for authenticated users
    
    try {
      const { data, error } = await supabase.functions.invoke('currency-conversion', {
        body: {
          action: 'bulk-convert',
          amounts: plans.map(p => p.price),
          targetCurrency: 'USD'
        }
      });

      if (!error && data?.conversions) {
        const priceMap = new Map<string, number>();
        plans.forEach((plan, index) => {
          priceMap.set(plan.id, data.conversions[index]?.converted || plan.price);
        });
        setConvertedPrices(priceMap);
      }
    } catch (error) {
      console.error('Currency conversion failed:', error);
    }
  };

  const fetchPlans = async () => {
    // Check cache first
    if (cachedPlans && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setPlans(cachedPlans);
      await convertPricesToUSD(cachedPlans);
      setLoading(false);
      return;
    }

    try {
      const { data: billingPlans, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      
      if (billingPlans) {
        // Update cache
        cachedPlans = billingPlans;
        cacheTimestamp = Date.now();
        setPlans(billingPlans);
        await convertPricesToUSD(billingPlans);
      }
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [user]); // Re-fetch when user auth state changes

  // Calculate pricing for all plans at component level
  const planPricingMap = useMemo(() => {
    const map = new Map();
    plans.forEach(plan => {
      // Use converted price for public visitors, original price for authenticated users
      const basePrice = user ? plan.price : (convertedPrices.get(plan.id) || plan.price);
      const pricing = {
        monthlyPrice: basePrice,
        annualDiscountMonths: (plan as any).annual_discount_months || 2,
        annualDiscountPercentage: (plan as any).annual_discount_percentage,
        // Show USD for public visitors, original currency for authenticated users
        currency: user ? ((plan as any).currency || 'KES') : 'USD'
      };
      map.set(plan.id, pricing);
    });
    return map;
  }, [plans, convertedPrices, user]);

  const getDisplayPrice = (plan: BillingPlan) => {
    const pricingConfig = planPricingMap.get(plan.id);
    if (!pricingConfig) return `$${plan.price.toLocaleString()}`;
    
    if (isAnnual) {
      const annualPrice = pricingConfig.monthlyPrice * 12;
      const discountMonths = pricingConfig.annualDiscountMonths || 2;
      const discountAmount = pricingConfig.monthlyPrice * discountMonths;
      const finalPrice = annualPrice - discountAmount;
      const symbol = pricingConfig.currency === 'USD' ? '$' : `${pricingConfig.currency} `;
      return `${symbol}${Math.round(finalPrice).toLocaleString()}`;
    }
    
    const symbol = pricingConfig.currency === 'USD' ? '$' : `${pricingConfig.currency} `;
    return `${symbol}${Math.round(pricingConfig.monthlyPrice).toLocaleString()}`;
  };

  const getDisplayPeriod = () => {
    return isAnnual ? '/year' : '/month';
  };

  const getDynamicSavings = (plan: BillingPlan) => {
    const pricingConfig = planPricingMap.get(plan.id);
    if (!pricingConfig || !isAnnual) return '';
    
    const discountMonths = pricingConfig.annualDiscountMonths || 2;
    const savingsAmount = pricingConfig.monthlyPrice * discountMonths;
    return `${Math.round(savingsAmount).toLocaleString()}`;
  };

  const formatFeatures = (features: any) => {
    if (Array.isArray(features)) {
      return features.map(feature => {
        // If feature is an object with name property, extract the name
        if (typeof feature === 'object' && feature !== null && feature.name) {
          return feature.name;
        }
        // If feature is already a string, return it
        if (typeof feature === 'string') {
          return feature;
        }
        // Fallback to string conversion
        return String(feature);
      });
    }
    if (typeof features === 'object' && features !== null) {
      return Object.values(features).map(feature => {
        if (typeof feature === 'object' && feature !== null && (feature as any).name) {
          return (feature as any).name;
        }
        return String(feature);
      }).flat();
    }
    return [];
  };

  const stats = useMemo(() => {
    const totalCustomers = plans.reduce((sum, plan) => sum + (plan.customers || 0), 0);
    return {
      totalCustomers,
      avgRating: 4.9,
      uptime: 99.9
    };
  }, [plans]);

  return {
    plans,
    loading,
    isAnnual,
    setIsAnnual,
    stats,
    getDisplayPrice,
    getDisplayPeriod,
    getDynamicSavings,
    formatFeatures,
    refetch: fetchPlans
  };
};