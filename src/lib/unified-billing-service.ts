import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  status: string;
  trial_end?: string;
  current_period_start?: string;
  current_period_end?: string;
  next_billing_date?: string;
  amount?: number;
  currency?: string;
  is_prorated_period?: boolean;
  setup_fee?: number;
  billing_plans?: {
    id: string;
    name: string;
    price: number;
    period: string;
    features: any;
  };
  created_at: string;
  updated_at: string;
}

export interface PaymentData {
  id: string;
  tenant_id: string;
  billing_plan_id?: string;
  amount: number;
  currency: string;
  payment_reference: string;
  payment_status: string;
  payment_type: string;
  created_at: string;
  paid_at?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  is_prorated?: boolean;
  full_period_amount?: number;
  proration_start_date?: string;
  proration_end_date?: string;
  billing_plans?: {
    name: string;
    price: number;
    period: string;
  };
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: any;
  badge?: string;
  badge_color?: string;
  popularity: number;
  original_price?: number;
  is_active: boolean;
}

export interface EffectivePricing {
  effective_amount: number;
  is_custom: boolean;
  custom_pricing_id?: string;
  discount_percentage?: number;
  original_amount: number;
  setup_fee?: number;
}

class UnifiedBillingService {
  /**
   * Get current subscription for a tenant - uses primary table only
   */
  async getCurrentSubscription(tenantId: string): Promise<SubscriptionData | null> {
    try {
      // Use only tenant_subscription_details as the primary source
      const { data, error } = await supabase
        .from('tenant_subscription_details')
        .select(`
          *,
          billing_plans (
            id,
            name,
            price,
            period,
            features
          )
        `)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as SubscriptionData | null;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  /**
   * Get payment history for a tenant
   */
  async getPaymentHistory(tenantId: string, limit = 10): Promise<PaymentData[]> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          billing_plans (
            name,
            price,
            period
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  /**
   * Get all active billing plans
   */
  async getBillingPlans(): Promise<BillingPlan[]> {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('popularity', { ascending: false });

      if (error) throw error;
      return (data || []) as BillingPlan[];
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      return [];
    }
  }

  /**
   * Get effective pricing for a tenant and billing plan
   */
  async getEffectivePricing(tenantId: string, billingPlanId: string): Promise<EffectivePricing | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_tenant_effective_pricing', {
          tenant_id_param: tenantId,
          billing_plan_id_param: billingPlanId
        });

      if (error) throw error;

      if (data && data.length > 0) {
        // Get setup fee from custom pricing if available
        const today = new Date().toISOString().split('T')[0];
        const { data: customPricing } = await supabase
          .from('tenant_custom_pricing')
          .select('setup_fee')
          .eq('tenant_id', tenantId)
          .eq('billing_plan_id', billingPlanId)
          .eq('is_active', true)
          .lte('effective_date', today)
          .or(`expires_at.is.null,expires_at.gte.${today}`)
          .order('effective_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...data[0],
          setup_fee: customPricing?.setup_fee || 0
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching effective pricing:', error);
      return null;
    }
  }

  /**
   * Create or update subscription
   */
  async createOrUpdateSubscription(subscriptionData: any): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await supabase
        .from('tenant_subscription_details')
        .upsert(subscriptionData, {
          onConflict: 'tenant_id'
        })
        .select(`
          *,
          billing_plans (
            id,
            name,
            price,
            period,
            features
          )
        `)
        .single();

      if (error) throw error;
      return data as SubscriptionData;
    } catch (error) {
      console.error('Error creating/updating subscription:', error);
      return null;
    }
  }

  /**
   * Record a payment
   */
  async recordPayment(paymentData: any): Promise<PaymentData | null> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .insert(paymentData)
        .select(`
          *,
          billing_plans (
            name,
            price,
            period
          )
        `)
        .single();

      if (error) throw error;
      return data as PaymentData;
    } catch (error) {
      console.error('Error recording payment:', error);
      return null;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentReference: string, status: string, metadata?: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_history')
        .update({
          payment_status: status,
          updated_at: new Date().toISOString(),
          paid_at: status === 'completed' ? new Date().toISOString() : null,
          failed_at: status === 'failed' ? new Date().toISOString() : null,
          metadata: metadata || {}
        })
        .eq('payment_reference', paymentReference);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
  }

  /**
   * Sync subscription status based on latest payment
   */
  async syncSubscriptionStatus(tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('manual_sync_subscription_status', {
          tenant_id_param: tenantId
        });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error syncing subscription status:', error);
      return false;
    }
  }

  /**
   * Check subscription access
   */
  checkSubscriptionAccess(subscription: SubscriptionData | null): {
    hasAccess: boolean;
    isTrialActive: boolean;
    isSubscriptionActive: boolean;
    daysLeftInTrial?: number;
    daysUntilExpiry?: number;
  } {
    if (!subscription) {
      return {
        hasAccess: true, // Grant access for new tenants
        isTrialActive: false,
        isSubscriptionActive: false
      };
    }

    const now = new Date();
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;

    // Check trial status
    const isTrialActive = trialEnd && now < trialEnd;
    const daysLeftInTrial = isTrialActive ? Math.ceil((trialEnd!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Check subscription status
    const isSubscriptionActive = subscription.status === 'active' && (!periodEnd || now < periodEnd);
    const daysUntilExpiry = periodEnd ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Grant access if active subscription, active trial, or pending payment
    const hasAccess = isSubscriptionActive || 
                     isTrialActive || 
                     subscription.status === 'pending' ||
                     subscription.status === 'trialing';

    return {
      hasAccess,
      isTrialActive: Boolean(isTrialActive),
      isSubscriptionActive,
      daysLeftInTrial: isTrialActive ? daysLeftInTrial : undefined,
      daysUntilExpiry: isSubscriptionActive && daysUntilExpiry > 0 ? daysUntilExpiry : undefined
    };
  }

  /**
   * Get feature access based on subscription
   */
  getFeatureAccess(subscription: SubscriptionData | null): Record<string, boolean | number> {
    const defaultFeatures = {
      // Basic features (always enabled)
      basic_pos: true,
      basic_inventory: true,
      basic_customers: true,
      basic_sales: true,
      enable_product_units: true,
      
      // Limits
      max_locations: 1,
      max_staff_users: 3,
      max_products: 500,
      
      // Premium features (require paid subscription)
      advanced_reporting: false,
      multi_location: false,
      user_roles: false,
      advanced_inventory: false,
      loyalty_program: false,
      gift_cards: false,
      online_orders: false,
      commission_tracking: false,
      advanced_accounting: false,
      bulk_operations: false,
      api_access: false,
      custom_branding: false,
      advanced_notifications: false,
      warehouse_management: false,
      advanced_analytics: false,
      ai_features: false,
      advanced_customer_management: false,
      custom_reports: false,
      dashboards: false,
      data_export: false,
      email_support: true,
      priority_support: false,
      phone_support: false,
      dedicated_account_manager: false,
      white_labeling: false,
      custom_domains: false,
      multi_tenant: false,
      enterprise_support: false,
      custom_integrations: false,
      backup_restore: false,
      sla_guarantee: false,
      priority_feature_requests: false,
    };

    if (!subscription?.billing_plans) {
      return defaultFeatures;
    }

    const accessInfo = this.checkSubscriptionAccess(subscription);
    if (!accessInfo.hasAccess) {
      return defaultFeatures;
    }

    const planName = subscription.billing_plans.name.toLowerCase();
    const features = { ...defaultFeatures };

    // Apply plan-specific features
    if (planName === 'enterprise' || accessInfo.isTrialActive) {
      // Enterprise or trial users get all features
      Object.keys(features).forEach(key => {
        if (typeof features[key] === 'boolean') {
          features[key] = true;
        } else if (key.startsWith('max_')) {
          features[key] = 999999; // Unlimited
        }
      });
    } else if (planName === 'professional') {
      // Professional plan features
      Object.keys(features).forEach(key => {
        if (typeof features[key] === 'boolean' && 
            !['white_labeling', 'custom_domains', 'phone_support', 'dedicated_account_manager'].includes(key)) {
          features[key] = true;
        }
      });
      features['max_locations'] = 5;
      features['max_staff_users'] = 999999;
      features['max_products'] = 5000;
      features['ai_features'] = true; // Enable AI features for Professional plan
      features['advanced_customer_management'] = true; // Enable advanced customer management for Professional plan
    } else if (planName === 'basic' || planName === 'starter') {
      // Basic/Starter plan - keep defaults but add some features
      features['advanced_reporting'] = true;
      features['user_roles'] = true;
      features['max_locations'] = 2;
      features['max_staff_users'] = 10;
      features['max_products'] = 1000;
      features['ai_features'] = true; // Enable AI features for Basic/Starter plan
      features['advanced_customer_management'] = true; // Enable advanced customer management for Basic/Starter plan
    }

    return features;
  }

  /**
   * Initiate payment checkout
   */
  async initiateCheckout(planId: string, tenantId: string, isSignup = false): Promise<{ authorization_url?: string; error?: string }> {
    try {
      // Get current session for auth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        throw new Error('No valid session found. Please log out and log back in.');
      }

      // Use Supabase Edge Function via client helper (automatically sets headers)
      const { data, error } = await supabase.functions.invoke('create-paystack-checkout', {
        body: {
          planId: planId,
          isSignup: isSignup
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to initiate checkout');
      }

      return { authorization_url: (data as any)?.authorization_url };
    } catch (error: any) {
      console.error('Error initiating checkout:', error);
      return { error: error.message || 'An error occurred while initiating checkout' };
    }
  }
}

// Export singleton instance
export const unifiedBillingService = new UnifiedBillingService();
