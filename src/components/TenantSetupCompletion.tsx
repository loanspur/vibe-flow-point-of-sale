import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TenantDataCollection } from './TenantDataCollection';
import { LoadingSpinner } from './LoadingSpinner';

export function TenantSetupCompletion() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);

  useEffect(() => {
    checkSetupStatus();
  }, [user]);

  const checkSetupStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Skip setup check - always go to dashboard
    // Business setup form workflow was removed as requested
    setLoading(false);
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Always render dashboard - business setup form workflow removed
  const TenantAdminDashboard = lazy(() => import('../pages/TenantAdminDashboard'));
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TenantAdminDashboard />
    </Suspense>
  );
}