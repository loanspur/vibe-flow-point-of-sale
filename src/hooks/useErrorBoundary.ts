import { useState, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

interface ErrorBoundaryOptions {
  onError?: (error: Error, errorInfo: any) => void;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  showToast?: boolean;
  logErrors?: boolean;
}

export function useErrorBoundary(options: ErrorBoundaryOptions = {}) {
  const { onError, showToast = true, logErrors = true } = options;
  const { toast } = useToast();
  
  const [errorState, setErrorState] = useState<ErrorBoundaryState>({
    hasError: false,
    error: null,
    errorInfo: null
  });

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    setErrorState({
      hasError: true,
      error,
      errorInfo
    });

    // Log error if enabled
    if (logErrors) {
      console.error('Error captured by boundary:', error, errorInfo);
    }

    // Show toast notification if enabled
    if (showToast) {
      toast({
        title: "Something went wrong",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }

    // Call custom error handler
    onError?.(error, errorInfo);
  }, [onError, showToast, logErrors, toast]);

  const reset = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }, []);

  const withErrorBoundary = useCallback(<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>
  ) => {
    return async (...args: T): Promise<R | void> => {
      try {
        const result = await fn(...args);
        return result;
      } catch (error) {
        captureError(error as Error);
      }
    };
  }, [captureError]);

  // Reset error state when component unmounts
  useEffect(() => {
    return () => {
      setErrorState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    };
  }, []);

  return {
    ...errorState,
    captureError,
    reset,
    withErrorBoundary
  };
}

// Hook for async operations with error handling
export function useAsyncOperation<T = any>(
  operation: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { withErrorBoundary } = useErrorBoundary();

  const execute = useCallback(
    withErrorBoundary(async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await operation();
        setData(result);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    }),
    [operation, withErrorBoundary]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
}