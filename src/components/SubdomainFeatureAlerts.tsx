import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sparkles, Info } from 'lucide-react';
import { useSubdomainFeatures } from '@/hooks/useSubdomainFeatures';

export function SubdomainFeatureAlerts() {
  const { 
    currentSubdomain, 
    availableFeatures, 
    unavailableFeatures, 
    showFeatureAlert,
    showUpgradeAlert,
    isTestTenant 
  } = useSubdomainFeatures();

  // Show upgrade alert on component mount for non-test tenants
  useEffect(() => {
    if (!isTestTenant && unavailableFeatures.length > 0) {
      // Delay the alert to avoid overwhelming the user
      const timer = setTimeout(() => {
        showUpgradeAlert();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isTestTenant, unavailableFeatures.length, showUpgradeAlert]);

  // Don't show anything for test tenants
  if (isTestTenant) {
    return null;
  }

  // Don't show if no unavailable features
  if (unavailableFeatures.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Sparkles className="h-5 w-5" />
          Premium Features Available
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-blue-700">
            Upgrade to access premium features available on the traction-energies subdomain:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {unavailableFeatures.map((feature) => (
              <div 
                key={feature.name}
                className="flex items-center justify-between p-2 bg-white rounded border border-blue-200"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{feature.name}</span>
                  {feature.badge && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => showFeatureAlert(feature)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Learn More
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-blue-200">
            <span className="text-xs text-blue-600">
              Current subdomain: {currentSubdomain || 'main'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={showUpgradeAlert}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
