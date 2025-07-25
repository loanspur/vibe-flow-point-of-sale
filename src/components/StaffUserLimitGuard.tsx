import { useState, useEffect } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FeatureLimitGuard } from '@/components/FeatureLimitGuard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StaffUserLimitGuardProps {
  children: React.ReactNode;
  showUpgradeDialog?: boolean;
  className?: string;
}

export const StaffUserLimitGuard = ({ 
  children, 
  showUpgradeDialog = true,
  className 
}: StaffUserLimitGuardProps) => {
  const { tenantId } = useAuth();
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      if (!tenantId) return;
      
      try {
        const { data, error } = await supabase
          .from('tenant_users')
          .select('id', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        if (error) throw error;
        
        setUserCount(data?.length || 0);
      } catch (error) {
        console.error('Error fetching user count:', error);
        setUserCount(1); // Default to 1 (current user)
      } finally {
        setLoading(false);
      }
    };

    fetchUserCount();
  }, [tenantId]);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <FeatureLimitGuard
      featureName="max_staff_users"
      currentCount={userCount}
      itemName="staff users"
      showUpgradeDialog={showUpgradeDialog}
      className={className}
    >
      {children}
    </FeatureLimitGuard>
  );
};