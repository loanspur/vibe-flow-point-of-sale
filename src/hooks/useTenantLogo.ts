import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTenantLogo() {
  const { tenantId } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLogo = async () => {
      if (!tenantId) {
        setLogoUrl(null);
        return;
      }
      const { data } = await supabase
        .from('business_settings')
        .select('company_logo_url')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (!isMounted) return;
      setLogoUrl((data as any)?.company_logo_url || null);
    };
    fetchLogo();

    const channel = tenantId
      ? supabase
          .channel('business-settings-logo')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'business_settings',
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              const newUrl = (payload.new as any)?.company_logo_url || null;
              setLogoUrl(newUrl);
            }
          )
          .subscribe()
      : null;

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return logoUrl;
}
