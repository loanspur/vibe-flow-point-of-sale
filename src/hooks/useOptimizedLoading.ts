import { useState, useEffect, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

interface UseOptimizedLoadingOptions {
  immediate?: boolean;
  timeout?: number;
  retries?: number;
}

export const useOptimizedLoading = <T>(
  loadingFn: () => Promise<T>,
  dependencies: any[] = [],
  options: UseOptimizedLoadingOptions = {}
) => {
  const { immediate = true, timeout = 10000, retries = 2 } = options;
  
  const [state, setState] = useState<LoadingState>({
    isLoading: immediate,
    error: null,
    data: null
  });

  const load = useCallback(async (retryCount = 0) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Add timeout to prevent hanging requests
      const loadPromise = loadingFn();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );

      const data = await Promise.race([loadPromise, timeoutPromise]) as T;
      
      setState({ isLoading: false, error: null, data });
      return data;
    } catch (error: any) {
      console.warn('Loading failed:', error.message);
      
      if (retryCount < retries) {
        // Exponential backoff for retries
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => load(retryCount + 1), delay);
        return;
      }

      setState({
        isLoading: false,
        error: error.message || 'Loading failed',
        data: null
      });
    }
  }, [loadingFn, timeout, retries]);

  useEffect(() => {
    if (immediate) {
      load();
    }
  }, dependencies);

  return {
    ...state,
    reload: () => load(),
    reset: () => setState({ isLoading: false, error: null, data: null })
  };
};

// Batch loading hook for multiple data sources
export const useBatchLoading = <T extends Record<string, () => Promise<any>>>(
  loaders: T,
  options: UseOptimizedLoadingOptions = {}
) => {
  const [states, setStates] = useState<Record<keyof T, LoadingState>>(() =>
    Object.keys(loaders).reduce((acc, key) => ({
      ...acc,
      [key]: { isLoading: true, error: null, data: null }
    }), {} as Record<keyof T, LoadingState>)
  );

  const loadAll = useCallback(async () => {
    // Start all loaders in parallel
    const promises = Object.entries(loaders).map(async ([key, loader]) => {
      try {
        const data = await (loader as () => Promise<any>)();
        setStates(prev => ({
          ...prev,
          [key]: { isLoading: false, error: null, data }
        }));
        return { key, data, error: null };
      } catch (error: any) {
        setStates(prev => ({
          ...prev,
          [key]: { isLoading: false, error: error.message, data: null }
        }));
        return { key, data: null, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    return results;
  }, [loaders]);

  useEffect(() => {
    if (options.immediate !== false) {
      loadAll();
    }
  }, []);

  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  const hasAnyError = Object.values(states).some(state => state.error);

  return {
    states,
    isLoading: isAnyLoading,
    hasError: hasAnyError,
    reload: loadAll
  };
};