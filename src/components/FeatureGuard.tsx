import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeatureGuardProps {
  featureName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirect?: boolean;
}

export const FeatureGuard = ({ 
  featureName, 
  children, 
  fallback, 
  redirect = false 
}: FeatureGuardProps) => {
  const { hasFeature, getFeatureUpgradeMessage, loading } = useFeatureAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hasFeature(featureName)) {
    return <>{children}</>;
  }

  if (redirect) {
    return <Navigate to="/admin/settings?tab=billing" replace />;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <Crown className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl text-orange-900">
            Premium Feature Required
          </CardTitle>
          <CardDescription className="text-orange-700">
            This feature requires a premium subscription to access
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <div className="p-4 bg-white/50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              {getFeatureUpgradeMessage(featureName)}
            </p>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Link to="/admin">
              <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-100">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Link to="/admin/settings?tab=billing">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};