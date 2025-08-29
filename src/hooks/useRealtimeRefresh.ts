import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeRefreshOptions {
  tables: string[];
  tenantId?: string | null;
  onChange: () => void;
  enabled?: boolean;
}

/**
 * DISABLED: Real-time subscription helper to prevent auto-refreshes
 * This hook is completely disabled to prevent flickering and unwanted refreshes
 */
export function useRealtimeRefresh({ tables, tenantId, onChange, enabled = true }: RealtimeRefreshOptions) {
  // Completely disabled to prevent auto-refreshes
  useEffect(() => {
    // No-op: Real-time subscriptions are disabled
    console.log('Real-time refresh disabled to prevent auto-refreshes');
  }, []);
}
