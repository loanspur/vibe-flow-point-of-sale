import { useCallback, useRef } from 'react';

/**
 * Creates a stable callback that doesn't change on every render
 * Useful for preventing unnecessary re-renders in child components
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);
  
  // Update the ref on every render
  callbackRef.current = callback;
  
  // Return a stable function that calls the current callback
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Creates a stable value that only changes when the value actually changes
 * Useful for preventing unnecessary re-renders when passing objects/arrays
 */
export function useStableValue<T>(value: T, deps: any[] = []): T {
  const valueRef = useRef<T>(value);
  const depsRef = useRef<any[]>(deps);
  
  // Check if deps have changed
  const depsChanged = depsRef.current.length !== deps.length || 
    depsRef.current.some((dep, index) => dep !== deps[index]);
  
  // Update refs if deps changed
  if (depsChanged) {
    valueRef.current = value;
    depsRef.current = deps;
  }
  
  return valueRef.current;
}

/**
 * Creates a stable object that only changes when its properties actually change
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  const objRef = useRef<T>(obj);
  const keysRef = useRef<string[]>(Object.keys(obj));
  
  // Check if object has changed
  const currentKeys = Object.keys(obj);
  const keysChanged = keysRef.current.length !== currentKeys.length ||
    keysRef.current.some(key => !currentKeys.includes(key)) ||
    currentKeys.some(key => obj[key] !== objRef.current[key]);
  
  // Update refs if object changed
  if (keysChanged) {
    objRef.current = obj;
    keysRef.current = currentKeys;
  }
  
  return objRef.current;
}

/**
 * Creates a stable array that only changes when its elements actually change
 */
export function useStableArray<T>(array: T[]): T[] {
  const arrayRef = useRef<T[]>(array);
  const lengthRef = useRef<number>(array.length);
  
  // Check if array has changed
  const lengthChanged = lengthRef.current !== array.length;
  const elementsChanged = !lengthChanged && 
    array.some((item, index) => item !== arrayRef.current[index]);
  
  // Update refs if array changed
  if (lengthChanged || elementsChanged) {
    arrayRef.current = array;
    lengthRef.current = array.length;
  }
  
  return arrayRef.current;
}