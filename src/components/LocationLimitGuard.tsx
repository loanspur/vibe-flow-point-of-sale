import { useState, useEffect } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FeatureLimitGuard } from '@/components/FeatureLimitGuard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LocationLimitGuardProps {
  children: React.ReactNode;
  showUpgradeDialog?: boolean;
  className?: string;
}

export const LocationLimitGuard = ({ 
  children, 
  showUpgradeDialog = true,
  className 
}: LocationLimitGuardProps) => {
  const { tenantId } = useAuth();
  const [locationCount, setLocationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocationCount = async () => {
      if (!tenantId) return;
      
      try {
        // Check if there's a locations table or use a default count
        // For now, we'll assume 1 location as default since multi-location isn't fully implemented
        setLocationCount(1);
      } catch (error) {
        console.error('Error fetching location count:', error);
        setLocationCount(1);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationCount();
  }, [tenantId]);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <FeatureLimitGuard
      featureName="max_locations"
      currentCount={locationCount}
      itemName="locations"
      showUpgradeDialog={showUpgradeDialog}
      className={className}
    >
      {children}
    </FeatureLimitGuard>
  );
};