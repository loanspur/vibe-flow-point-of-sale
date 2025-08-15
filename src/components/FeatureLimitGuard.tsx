import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { usePermissionError } from '@/hooks/usePermissionError';
import { FeatureRestriction } from '@/components/FeatureRestriction';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FeatureLimitGuardProps {
  featureName: string;
  currentCount: number;
  itemName: string; // e.g., "locations", "staff users"
  children: React.ReactNode;
  showUpgradeDialog?: boolean;
  className?: string;
}

export const FeatureLimitGuard = ({ 
  featureName, 
  currentCount,
  itemName,
  children, 
  showUpgradeDialog = true,
  className 
}: FeatureLimitGuardProps) => {
  const { getFeatureLimit, getFeatureUpgradeMessage } = useFeatureAccess();
  const { handleFeatureError } = usePermissionError({ showToast: false });
  
  const limit = getFeatureLimit(featureName);
  const isAtLimit = currentCount >= limit;
  const isNearLimit = currentCount >= (limit * 0.8); // 80% of limit

  // If not at limit, show content normally
  if (!isAtLimit) {
    return (
      <div className={className}>
        {isNearLimit && limit < 999999 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're approaching your {itemName} limit ({currentCount}/{limit}). 
              Consider upgrading to add more {itemName}.
            </AlertDescription>
          </Alert>
        )}
        {children}
      </div>
    );
  }

  // At limit - show restriction and log the specific limit error
  handleFeatureError(featureName, currentCount, limit);
  
  return (
    <FeatureRestriction
      featureName={featureName}
      upgradeMessage={`You've reached your ${itemName} limit (${currentCount}/${limit}). ${getFeatureUpgradeMessage(featureName)}`}
      showUpgradeDialog={showUpgradeDialog}
      className={className}
    >
      {children}
    </FeatureRestriction>
  );
};