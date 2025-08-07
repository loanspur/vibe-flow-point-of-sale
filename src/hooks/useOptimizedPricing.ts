import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const fetchPlans = async () => {
    // Check cache first
    if (cachedPlans && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setPlans(cachedPlans);
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
  }, []);

  // Calculate pricing for all plans at component level
  const planPricingMap = useMemo(() => {
    const map = new Map();
    plans.forEach(plan => {
      const pricing = {
        monthlyPrice: plan.price,
        annualDiscountMonths: (plan as any).annual_discount_months || 2,
        annualDiscountPercentage: (plan as any).annual_discount_percentage,
        // Default to USD for public pricing page, KES only for authenticated tenant users
        currency: (plan as any).currency || 'USD'
      };
      map.set(plan.id, pricing);
    });
    return map;
  }, [plans]);

  const getDisplayPrice = (plan: BillingPlan) => {
    const pricingConfig = planPricingMap.get(plan.id);
    if (!pricingConfig) return `$${plan.price.toLocaleString()}`;
    
    if (isAnnual) {
      const annualPrice = pricingConfig.monthlyPrice * 12;
      const discountMonths = pricingConfig.annualDiscountMonths || 2;
      const discountAmount = pricingConfig.monthlyPrice * discountMonths;
      const finalPrice = annualPrice - discountAmount;
      const symbol = pricingConfig.currency === 'USD' ? '$' : pricingConfig.currency;
      return `${symbol}${finalPrice.toLocaleString()}`;
    }
    
    const symbol = pricingConfig.currency === 'USD' ? '$' : pricingConfig.currency;
    return `${symbol}${pricingConfig.monthlyPrice.toLocaleString()}`;
  };

  const getDisplayPeriod = () => {
    return isAnnual ? '/year' : '/month';
  };

  const getDynamicSavings = (plan: BillingPlan) => {
    const pricingConfig = planPricingMap.get(plan.id);
    if (!pricingConfig || !isAnnual) return '';
    
    const discountMonths = pricingConfig.annualDiscountMonths || 2;
    const savingsAmount = pricingConfig.monthlyPrice * discountMonths;
    const symbol = pricingConfig.currency === 'USD' ? '$' : pricingConfig.currency;
    return `${savingsAmount.toLocaleString()}`;
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