import { useCallback, useRef, useEffect } from 'react';

// Single unified optimization hook
export function useOptimization() {
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cleanup all timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const debounce = useCallback((
    key: string,
    callback: () => void,
    delay: number = 300
  ) => {
    const timeouts = timeoutRefs.current;
    
    // Clear existing timeout for this key
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        callback();
      }
      timeouts.delete(key);
    }, delay);

    timeouts.set(key, timeoutId);
  }, []);

  const cleanup = useCallback(() => {
    const timeouts = timeoutRefs.current;
    timeouts.forEach(timeout => clearTimeout(timeout));
    timeouts.clear();
  }, []);

  return {
    debounce,
    cleanup,
    isMounted: () => mountedRef.current
  };
}