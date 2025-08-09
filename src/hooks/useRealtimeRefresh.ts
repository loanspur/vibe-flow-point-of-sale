import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeRefreshOptions {
  tables: string[];
  tenantId?: string | null;
  onChange: () => void;
}

/**
 * Lightweight Supabase realtime subscription helper.
 * Subscribes to INSERT/UPDATE/DELETE on given tables and triggers onChange
 * when the event belongs to the current tenant (if tenantId provided).
 */
export function useRealtimeRefresh({ tables, tenantId, onChange }: RealtimeRefreshOptions) {
  useEffect(() => {
    if (!tables || tables.length === 0) return;

    const channel = supabase.channel('schema-db-changes');

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: any) => {
          try {
            const rec = (payload.new ?? payload.old) as { tenant_id?: string } | null;
            if (tenantId) {
              if (rec && rec.tenant_id && rec.tenant_id !== tenantId) return; // ignore other tenants
            }
            onChange();
          } catch {
            onChange();
          }
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, JSON.stringify(tables)]);
}
