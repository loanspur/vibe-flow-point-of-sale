import { useCallback, useRef } from 'react';
import { useRealtimeRefresh } from './useRealtimeRefresh';

interface DebouncedRealtimeRefreshOptions {
  tables: string[];
  tenantId?: string | null;
  onChange: () => void;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Debounced version of useRealtimeRefresh to prevent excessive re-renders
 * from rapid database changes
 */
export function useDebouncedRealtimeRefresh({
  tables,
  tenantId,
  onChange,
  enabled = true,
  debounceMs = 1000
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
  
  useRealtimeRefresh({
    tables,
    tenantId,
    onChange: debouncedOnChange,
    enabled
  });
}