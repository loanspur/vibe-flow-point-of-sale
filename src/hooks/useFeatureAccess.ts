import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface FeatureAccess {
  [key: string]: boolean;
}

interface BillingPlan {
  id: string;
  name: string;
  features: any; // JSON field, can be array or object
}

interface TenantSubscription {
  billing_plan_id: string;
  status: string;
  expires_at?: string;
  current_period_end?: string;
  trial_end?: string;
  billing_plans?: BillingPlan;
  [key: string]: any; // Allow additional properties
}

// Default feature access for free/trial users
const DEFAULT_FEATURES: FeatureAccess = {
  // Basic features (always enabled)
  basic_pos: true,
  basic_inventory: true,
  basic_customers: true,
  basic_sales: true,
  
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
  
  // Premium+ features (require higher tier subscription)
  white_labeling: false,
  multi_tenant: false,
  enterprise_support: false,
  custom_integrations: false,
  advanced_analytics: false,
  data_export: false,
  backup_restore: false,
};

// Feature mapping for different business settings
const FEATURE_BUSINESS_SETTINGS_MAP: Record<string, string[]> = {
  advanced_inventory: [
    'enable_brands',
    'enable_product_units', 
    'enable_warranty',
    'enable_combo_products',
    'enable_wholesale_pricing',
    'enable_negative_stock',
    'enable_barcode_scanning'
  ],
  loyalty_program: ['enable_loyalty_program'],
  gift_cards: ['enable_gift_cards'],
  online_orders: ['enable_online_orders'],
  multi_location: ['enable_multi_location'],
  user_roles: ['enable_user_roles'],
  advanced_notifications: [
    'sms_enable_notifications',
    'whatsapp_enable_notifications',
    'email_notifications'
  ],
  advanced_pos: [
    'pos_enable_tips',
    'pos_enable_discounts'
  ]
};

export const useFeatureAccess = () => {
  const { tenantId } = useAuth();
  const [features, setFeatures] = useState<FeatureAccess>(DEFAULT_FEATURES);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchSubscriptionAndFeatures();
    }
  }, [tenantId]);

  const fetchSubscriptionAndFeatures = async () => {
    try {
      setLoading(true);
      
      // Fetch current subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('tenant_subscription_details')
        .select(`
          *,
          billing_plans (
            id,
            name,
            features
          )
        `)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      let finalSubscription = subscriptionData;

      // Fallback to tenant_subscriptions if needed
      if (!subscriptionData) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tenant_subscriptions')
          .select(`
            *,
            billing_plans (
              id,
              name,
              features
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .maybeSingle();

        if (fallbackError && fallbackError.code !== 'PGRST116') {
          throw fallbackError;
        }
        
        finalSubscription = fallbackData as any;
      }

      setSubscription(finalSubscription as any);
      
      if (finalSubscription?.billing_plans?.features) {
        const planFeatures = finalSubscription.billing_plans.features;
        const accessibleFeatures = { ...DEFAULT_FEATURES };
        
        // Check if subscription is active and not expired
        const isActive = finalSubscription.status === 'active';
        const expiryDate = (finalSubscription as any).expires_at || 
                         (finalSubscription as any).current_period_end;
        const isNotExpired = !expiryDate || new Date(expiryDate) > new Date();
        const isValidSubscription = isActive && isNotExpired;

        if (isValidSubscription && Array.isArray(planFeatures)) {
          // Enable features based on billing plan
          planFeatures.forEach((feature: { name: string; included: boolean }) => {
            if (feature.included && accessibleFeatures.hasOwnProperty(feature.name)) {
              accessibleFeatures[feature.name] = true;
            }
          });
        }
        
        setFeatures(accessibleFeatures);
      } else {
        // No subscription or features, use defaults (trial/free tier)
        setFeatures(DEFAULT_FEATURES);
      }
    } catch (error) {
      console.error('Error fetching subscription features:', error);
      setFeatures(DEFAULT_FEATURES);
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (featureName: string): boolean => {
    return features[featureName] || false;
  };

  const getRestrictedSettings = (): string[] => {
    const restricted: string[] = [];
    
    Object.entries(FEATURE_BUSINESS_SETTINGS_MAP).forEach(([featureName, settingNames]) => {
      if (!hasFeature(featureName)) {
        restricted.push(...settingNames);
      }
    });
    
    return restricted;
  };

  const isSettingRestricted = (settingName: string): boolean => {
    return getRestrictedSettings().includes(settingName);
  };

  const getFeatureUpgradeMessage = (featureName: string): string => {
    const featureMessages: Record<string, string> = {
      advanced_inventory: "Upgrade to access advanced inventory features like brands, units, and warranty tracking",
      loyalty_program: "Upgrade to enable customer loyalty programs and rewards",
      gift_cards: "Upgrade to offer gift cards to your customers",
      online_orders: "Upgrade to accept online orders and expand your reach",
      multi_location: "Upgrade to manage multiple store locations",
      user_roles: "Upgrade to assign different roles and permissions to team members",
      advanced_notifications: "Upgrade to send SMS, WhatsApp, and advanced email notifications",
      advanced_reporting: "Upgrade to access detailed analytics and advanced reporting features",
      commission_tracking: "Upgrade to track sales commissions for your team",
      advanced_accounting: "Upgrade to access advanced accounting and financial features"
    };
    
    return featureMessages[featureName] || "Upgrade your subscription to access this feature";
  };

  return {
    features,
    subscription,
    loading,
    hasFeature,
    isSettingRestricted,
    getRestrictedSettings,
    getFeatureUpgradeMessage,
    refreshFeatures: fetchSubscriptionAndFeatures
  };
};