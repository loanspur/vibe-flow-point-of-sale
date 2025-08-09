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

    const channelName = `schema-db-changes:${tenantId ?? 'global'}:${tables.slice().sort().join(',')}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      const params: any = { event: '*', schema: 'public', table };
      if (tenantId) {
        params.filter = `tenant_id=eq.${tenantId}`;
      }
      channel.on('postgres_changes', params, () => {
        onChange();
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    }, [tenantId, onChange, JSON.stringify(tables)]);
}
