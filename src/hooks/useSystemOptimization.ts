import { useCallback, useRef } from 'react';
import { SYSTEM_CONFIG, systemUtils } from '@/lib/system-config';

/**
 * Centralized optimization hook to replace scattered timeout/debounce logic
 */
export function useSystemOptimization() {
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Debounced function execution with cleanup
   */
  const debounce = useCallback((
    key: string,
    callback: () => void,
    delay?: number
  ) => {
    const timeouts = timeoutRefs.current;
    
    // Clear existing timeout for this key
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      callback();
      timeouts.delete(key);
    }, delay || SYSTEM_CONFIG.DEFAULT_DEBOUNCE_DELAY);

    timeouts.set(key, timeoutId);
  }, []);

  /**
   * Clean up all timeouts
   */
  const cleanup = useCallback(() => {
    const timeouts = timeoutRefs.current;
    timeouts.forEach(timeout => clearTimeout(timeout));
    timeouts.clear();
  }, []);

  /**
   * Optimized database operation with standard delay
   */
  const databaseOperation = useCallback(async (operation: () => Promise<void>) => {
    await operation();
    await systemUtils.delay(SYSTEM_CONFIG.DATABASE_OPERATION_DELAY);
  }, []);

  return {
    debounce,
    cleanup,
    databaseOperation,
    delay: systemUtils.delay,
    log: systemUtils.log
  };
}