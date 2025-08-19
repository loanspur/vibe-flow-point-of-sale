import { useCallback, useRef, useEffect } from 'react';
import { PERFORMANCE_CONFIG } from '@/lib/performance-config';

/**
 * Central performance optimization hook to prevent common issues
 * that cause frequent reloads and browser switching problems
 */
export function usePerformanceOptimizer() {
  const mountedRef = useRef(true);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastExecutionRef = useRef<Map<string, number>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Clear all timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  // Debounced execution with automatic cleanup
  const debounceExecution = useCallback((
    key: string,
    callback: () => void,
    delay?: number
  ) => {
    if (!mountedRef.current) return;

    const timeouts = timeoutRefs.current;
    const executions = lastExecutionRef.current;
    
    // Clear existing timeout for this key
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
    }

    // Check if we executed too recently (prevent spam)
    const lastExecution = executions.get(key) || 0;
    const minInterval = delay || PERFORMANCE_CONFIG.REALTIME_DEBOUNCE_DELAY;
    const timeSinceLastExecution = Date.now() - lastExecution;
    
    if (timeSinceLastExecution < minInterval) {
      // Too soon, schedule for later
      const remainingDelay = minInterval - timeSinceLastExecution;
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          callback();
          executions.set(key, Date.now());
        }
        timeouts.delete(key);
      }, remainingDelay);
      
      timeouts.set(key, timeoutId);
    } else {
      // Execute immediately
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          callback();
          executions.set(key, Date.now());
        }
        timeouts.delete(key);
      }, 0);
      
      timeouts.set(key, timeoutId);
    }
  }, []);

  // Throttled execution for high-frequency events
  const throttleExecution = useCallback((
    key: string,
    callback: () => void,
    interval: number = 1000
  ) => {
    if (!mountedRef.current) return;

    const executions = lastExecutionRef.current;
    const lastExecution = executions.get(key) || 0;
    const timeSinceLastExecution = Date.now() - lastExecution;
    
    if (timeSinceLastExecution >= interval) {
      callback();
      executions.set(key, Date.now());
    }
  }, []);

  // Safe async operation wrapper
  const safeAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    if (!mountedRef.current) return null;

    try {
      const result = await operation();
      return mountedRef.current ? result : null;
    } catch (error) {
      if (mountedRef.current) {
        console.error(errorMessage || 'Async operation failed:', error);
      }
      return null;
    }
  }, []);

  // Cleanup specific timeout
  const clearExecution = useCallback((key: string) => {
    const timeouts = timeoutRefs.current;
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
      timeouts.delete(key);
    }
  }, []);

  // Cleanup all pending operations
  const clearAllExecutions = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    lastExecutionRef.current.clear();
  }, []);

  return {
    debounceExecution,
    throttleExecution,
    safeAsyncOperation,
    clearExecution,
    clearAllExecutions,
    isComponentMounted: () => mountedRef.current
  };
}

/**
 * Hook to prevent window focus refresh issues
 */
export function useStableWindowFocus() {
  const focusTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFocusRef = useRef<number>(0);

  const onWindowFocus = useCallback((callback: () => void) => {
    const now = Date.now();
    const timeSinceLastFocus = now - lastFocusRef.current;
    
    // Prevent rapid focus events (common when switching browsers)
    if (timeSinceLastFocus < PERFORMANCE_CONFIG.TAB_SWITCH_DELAY) {
      return;
    }

    // Clear existing timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    // Debounce the focus event
    focusTimeoutRef.current = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        callback();
        lastFocusRef.current = Date.now();
      }
    }, PERFORMANCE_CONFIG.TAB_SWITCH_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  return { onWindowFocus };
}