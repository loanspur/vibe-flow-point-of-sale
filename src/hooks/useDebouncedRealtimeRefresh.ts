import { useCallback, useRef } from 'react';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import { PERFORMANCE_CONFIG } from '@/lib/performance-config';

interface DebouncedRealtimeRefreshOptions {
  tables: string[];
  tenantId?: string | null;
  onChange: () => void;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Debounced version of useRealtimeRefresh to prevent excessive re-renders
 * from rapid database changes. Uses performance config for optimal debounce timing.
 */
export function useDebouncedRealtimeRefresh({
  tables,
  tenantId,
  onChange,
  enabled = true,
  debounceMs = PERFORMANCE_CONFIG.REALTIME_DEBOUNCE_DELAY // Use global performance setting
}: DebouncedRealtimeRefreshOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedOnChange = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange();
    }, debounceMs);
  }, [onChange, debounceMs]);
  
  // Only enable if performance config allows realtime updates
  const realtimeEnabled = enabled && !PERFORMANCE_CONFIG.DISABLE_AUTO_REFRESH;
  
  useRealtimeRefresh({
    tables,
    tenantId,
    onChange: debouncedOnChange,
    enabled: realtimeEnabled
  });
}