import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface FeatureAccess {
  [key: string]: boolean | number;
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
  
  // Location limits
  max_locations: 1, // Starter: 1, Professional: 5, Enterprise: unlimited
  
  // Staff user limits
  max_staff_users: 3, // Starter: 3, Professional: unlimited, Enterprise: unlimited
  
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
  
  // Analytics & Reporting
  advanced_analytics: false,
  custom_reports: false,
  dashboards: false,
  data_export: false,
  
  // Support levels
  email_support: true, // All plans
  priority_support: false, // Professional+
  phone_support: false, // Enterprise only
  dedicated_account_manager: false, // Enterprise only
  
  // Premium+ features (require higher tier subscription)
  white_labeling: false,
  custom_domains: false,
  multi_tenant: false,
  enterprise_support: false,
  custom_integrations: false,
  backup_restore: false,
  sla_guarantee: false,
  priority_feature_requests: false,
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
  ],
  white_labeling: [
    'custom_domains',
    'custom_branding'
  ],
  api_access: [
    'api_integrations',
    'webhook_access'
  ],
  custom_integrations: [
    'third_party_integrations',
    'custom_api_endpoints'
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
          // Map billing plan features to system features
          const planName = finalSubscription.billing_plans.name.toLowerCase();
          
          // For Enterprise plan, enable all features by default
          if (planName === 'enterprise') {
            // Enable all boolean features for Enterprise
            Object.keys(accessibleFeatures).forEach(key => {
              if (typeof accessibleFeatures[key] === 'boolean') {
                accessibleFeatures[key] = true;
              } else if (key === 'max_locations' || key === 'max_staff_users') {
                accessibleFeatures[key] = 999999; // Unlimited
              }
            });
          }
          
          planFeatures.forEach((feature: { name: string; included: boolean; limit?: number | string }) => {
            if (feature.included) {
              // Handle location limits
              if (feature.name.includes('Location')) {
                if (feature.name.includes('Unlimited')) {
                  accessibleFeatures['max_locations'] = 999999; // Unlimited
                  accessibleFeatures['multi_location'] = true;
                } else {
                  const limitMatch = feature.name.match(/(\d+)/);
                  if (limitMatch) {
                    accessibleFeatures['max_locations'] = parseInt(limitMatch[1]);
                    accessibleFeatures['multi_location'] = parseInt(limitMatch[1]) > 1;
                  }
                }
              }
              
              // Handle staff user limits
              if (feature.name.includes('Staff Users')) {
                if (feature.name.includes('Unlimited')) {
                  accessibleFeatures['max_staff_users'] = 999999; // Unlimited
                  accessibleFeatures['user_roles'] = true;
                } else {
                  const limitMatch = feature.name.match(/(\d+)/);
                  if (limitMatch) {
                    accessibleFeatures['max_staff_users'] = parseInt(limitMatch[1]);
                  }
                }
              }
              
              // Map feature names to system features
              const featureMappings: Record<string, string[]> = {
                'Advanced Inventory & Analytics': ['advanced_inventory', 'advanced_analytics'],
                'Basic Inventory Management': ['basic_inventory'],
                'Custom Reports & Dashboards': ['custom_reports', 'dashboards', 'advanced_reporting'],
                'Standard Reports': ['basic_reporting'],
                'API Access': ['api_access'],
                'Custom Integrations': ['custom_integrations'],
                'Customer Loyalty Programs': ['loyalty_program'],
                'Multi-tenant Management': ['multi_tenant'],
                'White-label Solutions': ['white_labeling', 'custom_domains'],
                'Priority Support': ['priority_support'],
                'Email Support': ['email_support'],
                '24/7 Phone Support': ['phone_support'],
                'Dedicated Account Manager': ['dedicated_account_manager'],
                'Advanced Security Features': ['enterprise_support'],
                'SLA Guarantee': ['sla_guarantee'],
                'Priority Feature Requests': ['priority_feature_requests']
              };
              
              // Apply feature mappings
              const mappedFeatures = featureMappings[feature.name] || [];
              mappedFeatures.forEach(mappedFeature => {
                if (accessibleFeatures.hasOwnProperty(mappedFeature)) {
                  accessibleFeatures[mappedFeature] = true;
                }
              });
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
    const feature = features[featureName];
    return typeof feature === 'boolean' ? feature : false;
  };

  const getFeatureLimit = (featureName: string): number => {
    const feature = features[featureName];
    return typeof feature === 'number' ? feature : 0;
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
      // Inventory & Product Management
      advanced_inventory: "Upgrade to access advanced inventory features like brands, units, and warranty tracking",
      
      // Customer Features
      loyalty_program: "Upgrade to enable customer loyalty programs and rewards",
      gift_cards: "Upgrade to offer gift cards to your customers",
      online_orders: "Upgrade to accept online orders and expand your reach",
      
      // Business Operations
      multi_location: "Upgrade to manage multiple store locations",
      max_locations: "Upgrade to add more business locations",
      user_roles: "Upgrade to assign different roles and permissions to team members",
      max_staff_users: "Upgrade to add more staff users to your account",
      
      // Communication & Notifications
      advanced_notifications: "Upgrade to send SMS, WhatsApp, and advanced email notifications",
      
      // Analytics & Reporting
      advanced_reporting: "Upgrade to access detailed analytics and advanced reporting features",
      advanced_analytics: "Upgrade to access advanced analytics and business insights",
      custom_reports: "Upgrade to create custom reports and dashboards",
      dashboards: "Upgrade to access advanced dashboard features",
      data_export: "Upgrade to export your business data",
      
      // Integrations & API
      api_access: "Upgrade to access API integrations and third-party connections",
      custom_integrations: "Upgrade to enable custom integrations and webhooks",
      
      // Support
      priority_support: "Upgrade to get priority customer support",
      phone_support: "Upgrade to Enterprise for 24/7 phone support",
      dedicated_account_manager: "Upgrade to Enterprise for a dedicated account manager",
      
      // White Label & Branding
      white_labeling: "Upgrade to Enterprise for white-label solutions",
      custom_domains: "Upgrade to Enterprise for custom domain support",
      custom_branding: "Upgrade to add custom branding to your application",
      
      // Enterprise Features
      enterprise_support: "Upgrade to Enterprise for advanced security and support features",
      sla_guarantee: "Upgrade to Enterprise for SLA guarantees",
      priority_feature_requests: "Upgrade to Enterprise for priority feature requests",
      
      // Other Features
      commission_tracking: "Upgrade to track sales commissions for your team",
      advanced_accounting: "Upgrade to access advanced accounting and financial features",
      multi_tenant: "Upgrade to manage multiple business tenants"
    };
    
    return featureMessages[featureName] || "Upgrade your subscription to access this feature";
  };

  return {
    features,
    subscription,
    loading,
    hasFeature,
    getFeatureLimit,
    isSettingRestricted,
    getRestrictedSettings,
    getFeatureUpgradeMessage,
    refreshFeatures: fetchSubscriptionAndFeatures
  };
};