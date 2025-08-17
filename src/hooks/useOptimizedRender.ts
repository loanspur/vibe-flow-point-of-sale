import { useRef, useCallback, useMemo } from 'react';

/**
 * Prevents rapid re-renders by debouncing render cycles
 */
export function useRenderDebounce(delay: number = 16) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const renderCountRef = useRef(0);

  const debouncedRender = useCallback((callback: () => void) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      renderCountRef.current++;
      callback();
    }, delay);
  }, [delay]);

  return { debouncedRender, renderCount: renderCountRef.current };
}

/**
 * Memoizes expensive calculations with stable references
 */
export function useStableMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const cache = useRef<{ deps: React.DependencyList; value: T } | null>(null);

  const hasChanged = !cache.current || 
    deps.length !== cache.current.deps.length ||
    deps.some((dep, index) => dep !== cache.current!.deps[index]);

  if (hasChanged) {
    cache.current = { deps, value: factory() };
  }

  return cache.current.value;
}

/**
 * Batches multiple state updates to prevent multiple renders
 */
export function useBatchedUpdates() {
  const updatesRef = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updateFn: () => void) => {
    updatesRef.current.push(updateFn);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const updates = updatesRef.current;
      updatesRef.current = [];
      
      // Execute all batched updates
      updates.forEach(update => update());
    }, 0);
  }, []);

  return batchUpdate;
}