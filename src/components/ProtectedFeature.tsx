import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FeatureRestriction } from '@/components/FeatureRestriction';

interface ProtectedFeatureProps {
  featureName: string;
  fallback?: React.ReactNode;
  showUpgradeDialog?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ProtectedFeature = ({ 
  featureName, 
  fallback, 
  showUpgradeDialog = true,
  children, 
  className 
}: ProtectedFeatureProps) => {
  const { hasFeature, getFeatureUpgradeMessage } = useFeatureAccess();

  if (hasFeature(featureName)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <FeatureRestriction
      featureName={featureName}
      upgradeMessage={getFeatureUpgradeMessage(featureName)}
      showUpgradeDialog={showUpgradeDialog}
      className={className}
    >
      {children}
    </FeatureRestriction>
  );
};