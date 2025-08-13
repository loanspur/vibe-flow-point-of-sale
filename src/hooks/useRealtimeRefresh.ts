import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeRefreshOptions {
  tables: string[];
  tenantId?: string | null;
  onChange: () => void;
  enabled?: boolean;
}

/**
 * Lightweight Supabase realtime subscription helper.
 * Subscribes to INSERT/UPDATE/DELETE on given tables and triggers onChange
 * when the event belongs to the current tenant (if tenantId provided).
 */
export function useRealtimeRefresh({ tables, tenantId, onChange, enabled = true }: RealtimeRefreshOptions) {
  useEffect(() => {
    if (!enabled || !tables || tables.length === 0) return;

    const channelName = `schema-db-changes:${tenantId ?? 'global'}:${tables.slice().sort().join(',')}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      const params: any = { event: '*', schema: 'public', table };
      channel.on('postgres_changes', params, (payload: any) => {
        try {
          if (!tenantId) {
            onChange();
            return;
          }
          const rec: any = payload?.new ?? payload?.old ?? {};
          // Only trigger when event belongs to this tenant if column exists
          if (typeof rec.tenant_id === 'undefined' || rec.tenant_id === tenantId) {
            onChange();
          }
        } catch {
          onChange();
        }
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    }, [tenantId, onChange, enabled, JSON.stringify(tables)]);
}
