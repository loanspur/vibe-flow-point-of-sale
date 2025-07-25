import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

/**
 * Hook for component optimization utilities
 */
export function useComponentOptimization() {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  /**
   * Creates a memoized callback that only changes when dependencies change
   */
  const createStableCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
  ): T => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback(callback, deps);
  }, []);

  /**
   * Creates a memoized value that only recalculates when dependencies change
   */
  const createStableValue = useCallback(<T>(
    factory: () => T,
    deps: React.DependencyList
  ): T => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(factory, deps);
  }, []);

  /**
   * Performance debugging utility
   */
  const getRenderInfo = useCallback(() => ({
    renderCount: renderCountRef.current,
    timestamp: Date.now(),
  }), []);

  return {
    createStableCallback,
    createStableValue,
    getRenderInfo,
    renderCount: renderCountRef.current
  };
}

/**
 * Hook for creating stable object references
 */
export function useStableObject<T extends Record<string, any>>(
  object: T,
  deps: React.DependencyList
): T {
  return useMemo(() => object, deps);
}

/**
 * Hook for creating stable array references
 */
export function useStableArray<T>(
  array: T[],
  deps: React.DependencyList
): T[] {
  return useMemo(() => array, deps);
}

/**
 * Hook for debounced state updates
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void, T] {
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const [currentValue, setCurrentValue] = useState(initialValue);
  
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateValue = useCallback((newValue: T) => {
    setCurrentValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [debouncedValue, updateValue, currentValue];
}

/**
 * Hook for measuring component performance
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>();
  const totalRenderTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Start timing at the beginning of render
  renderStartTime.current = performance.now();
  renderCount.current += 1;

  useEffect(() => {
    // End timing after render is complete
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      totalRenderTime.current += renderTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${componentName}] Render #${renderCount.current}: ${renderTime.toFixed(2)}ms`);
        console.log(`[${componentName}] Average render time: ${(totalRenderTime.current / renderCount.current).toFixed(2)}ms`);
      }
    }
  });

  return {
    renderCount: renderCount.current,
    averageRenderTime: totalRenderTime.current / renderCount.current || 0
  };
}