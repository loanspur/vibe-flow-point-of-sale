import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAccountingRealtime = (onUpdate: () => void) => {
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('accounting-centralized-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounting_transactions',
          filter: `tenant_id=eq.${tenantId}`
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounting_entries'
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `tenant_id=eq.${tenantId}`
        },
        onUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, onUpdate]);
};
