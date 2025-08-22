import { useUnifiedBilling } from './useUnifiedBilling';

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
  // Use the unified billing hook instead of implementing our own logic
  const {
    subscription,
    loading,
    featureAccess: features,
    hasFeature,
    getFeatureLimit
  } = useUnifiedBilling();

  // hasFeature and getFeatureLimit are already provided by useUnifiedBilling

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
    refreshFeatures: () => {} // No longer needed as unified billing auto-refreshes
  };
};