import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Crown, Users, Building2, BarChart3, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SubscriptionFeatureSummary = () => {
  const { 
    features, 
    subscription, 
    loading, 
    hasFeature, 
    getFeatureLimit,
    getFeatureUpgradeMessage 
  } = useFeatureAccess();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading subscription details...</div>
        </CardContent>
      </Card>
    );
  }

  const planName = subscription?.billing_plans?.name || 'Free Trial';
  const maxLocations = getFeatureLimit('max_locations');
  const maxStaffUsers = getFeatureLimit('max_staff_users');

  const featureCategories = [
    {
      title: 'Business Operations',
      icon: Building2,
      features: [
        { key: 'max_locations', label: `Locations: ${maxLocations === 999999 ? 'Unlimited' : maxLocations}`, type: 'limit' },
        { key: 'max_staff_users', label: `Staff Users: ${maxStaffUsers === 999999 ? 'Unlimited' : maxStaffUsers}`, type: 'limit' },
        { key: 'multi_location', label: 'Multi-location Management', type: 'boolean' },
        { key: 'user_roles', label: 'User Roles & Permissions', type: 'boolean' },
      ]
    },
    {
      title: 'Inventory & Products',
      icon: BarChart3,
      features: [
        { key: 'basic_inventory', label: 'Basic Inventory Management', type: 'boolean' },
        { key: 'advanced_inventory', label: 'Advanced Inventory Features', type: 'boolean' },
        { key: 'loyalty_program', label: 'Customer Loyalty Programs', type: 'boolean' },
        { key: 'gift_cards', label: 'Gift Cards', type: 'boolean' },
      ]
    },
    {
      title: 'Analytics & Reporting',
      icon: BarChart3,
      features: [
        { key: 'advanced_reporting', label: 'Advanced Reporting', type: 'boolean' },
        { key: 'advanced_analytics', label: 'Advanced Analytics', type: 'boolean' },
        { key: 'custom_reports', label: 'Custom Reports', type: 'boolean' },
        { key: 'dashboards', label: 'Advanced Dashboards', type: 'boolean' },
        { key: 'data_export', label: 'Data Export', type: 'boolean' },
      ]
    },
    {
      title: 'Integrations & API',
      icon: Zap,
      features: [
        { key: 'api_access', label: 'API Access', type: 'boolean' },
        { key: 'custom_integrations', label: 'Custom Integrations', type: 'boolean' },
        { key: 'online_orders', label: 'Online Orders', type: 'boolean' },
      ]
    },
    {
      title: 'Support & Enterprise',
      icon: Shield,
      features: [
        { key: 'email_support', label: 'Email Support', type: 'boolean' },
        { key: 'priority_support', label: 'Priority Support', type: 'boolean' },
        { key: 'phone_support', label: '24/7 Phone Support', type: 'boolean' },
        { key: 'dedicated_account_manager', label: 'Dedicated Account Manager', type: 'boolean' },
      ]
    },
    {
      title: 'White Label & Branding',
      icon: Crown,
      features: [
        { key: 'white_labeling', label: 'White-label Solutions', type: 'boolean' },
        { key: 'custom_domains', label: 'Custom Domains', type: 'boolean' },
        { key: 'custom_branding', label: 'Custom Branding', type: 'boolean' },
        { key: 'sla_guarantee', label: 'SLA Guarantee', type: 'boolean' },
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Current Plan: {planName}
            </CardTitle>
            <CardDescription>
              Your subscription features and limitations
            </CardDescription>
          </div>
          <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
            {subscription?.status || 'Trial'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {featureCategories.map((category) => (
          <div key={category.title} className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <category.icon className="h-4 w-4" />
              {category.title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {category.features.map((feature) => {
                const hasAccess = hasFeature(feature.key);
                const featureValue = features[feature.key];
                
                return (
                  <div key={feature.key} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">{feature.label}</span>
                    {feature.type === 'boolean' ? (
                      hasAccess ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )
                    ) : (
                      <Badge variant={hasAccess ? 'default' : 'secondary'} className="text-xs">
                        {typeof featureValue === 'number' && featureValue === 999999 ? 'Unlimited' : String(featureValue)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {planName.toLowerCase() !== 'enterprise' && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Need more features?</p>
                <p className="text-xs text-muted-foreground">
                  Upgrade your plan to unlock additional capabilities
                </p>
              </div>
              <Button asChild>
                <Link to="/billing">
                  Upgrade Plan
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};