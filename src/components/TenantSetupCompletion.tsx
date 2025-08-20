import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TenantDataCollection } from './TenantDataCollection';
import { LoadingSpinner } from './LoadingSpinner';

export function TenantSetupCompletion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);

  useEffect(() => {
    checkSetupStatus();
  }, [user]);

  const checkSetupStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Get user's tenant info
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) {
        navigate('/auth');
        return;
      }

      // Check if tenant has complete business information
      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

      if (!tenant) {
        navigate('/auth');
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
        // Prepare existing data for the form
        setExistingData({
          businessName: tenant.name || '',
          businessPhone: tenant.contact_phone || '',
          businessEmail: tenant.contact_email || '',
          address: tenant.address || '',
          city: '', // Field not available in tenant schema
          country: tenant.country || 'Kenya',
          website: '', // Field not available in tenant schema
          taxNumber: '', // Field not available in tenant schema
          registrationNumber: '', // Field not available in tenant schema
          businessDescription: '', // Field not available in tenant schema
          postalCode: '' // Field not available in tenant schema
        });
      } else {
        // Setup is complete, redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      navigate('/dashboard'); // Fallback to dashboard
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!needsSetup) {
    return null; // Will redirect to dashboard
  }

  return (
    <TenantDataCollection 
      mode="update"
      existingData={existingData}
      onSuccess={handleSetupComplete}
    />
  );
}