import { useCallback, useRef } from 'react';

/**
 * Creates a stable callback that doesn't change on every render
 * Prevents unnecessary re-renders caused by callback recreations
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Creates a stable value that only changes when dependencies change
 * Prevents unnecessary re-renders from object/array recreations
 */
export function useStableValue<T>(value: T, deps: React.DependencyList): T {
  const ref = useRef<T>(value);
  const depsRef = useRef(deps);
  
  // Check if dependencies have changed
  const depsChanged = deps.some((dep, index) => dep !== depsRef.current[index]);
  
  if (depsChanged) {
    ref.current = value;
    depsRef.current = deps;
  }
  
  return ref.current;
}