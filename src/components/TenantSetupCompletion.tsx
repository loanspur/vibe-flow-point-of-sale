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

    try {
      // Get user's tenant info
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.tenant_id) {
        setLoading(false);
        return;
      }

      // Check if tenant has complete business information
      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .maybeSingle();

      if (!tenant) {
        setLoading(false);
        return;
      }

      // Check if setup is incomplete (basic required fields missing)
      const isIncomplete = !tenant.name || 
                          !tenant.contact_phone || 
                          !tenant.contact_email || 
                          !tenant.address || 
                          !tenant.country;

      if (isIncomplete) {
        setNeedsSetup(true);
        setExistingData({
          businessName: tenant.name || '',
          businessPhone: tenant.contact_phone || '',
          businessEmail: tenant.contact_email || '',
          address: tenant.address || '',
          city: '',
          country: tenant.country || 'Kenya',
          website: '',
          taxNumber: '',
          registrationNumber: '',
          businessDescription: '',
          postalCode: ''
        });
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setLoading(false);
    }
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

  if (!needsSetup) {
    // Import TenantAdminDashboard dynamically to prevent circular imports
    const TenantAdminDashboard = lazy(() => import('../pages/TenantAdminDashboard'));
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <TenantAdminDashboard />
      </Suspense>
    );
  }

  return (
    <TenantDataCollection 
      mode="update"
      existingData={existingData}
      onSuccess={handleSetupComplete}
    />
  );
}