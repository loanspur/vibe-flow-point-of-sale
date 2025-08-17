import React, { memo, useMemo } from 'react';
import { SafeWrapper } from './SafeWrapper';
import { useStableCallback } from '@/hooks/useStableCallback';

interface OptimizedPerformanceWrapperProps {
  children: React.ReactNode;
  dependencies?: any[];
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

/**
 * High-performance wrapper that prevents unnecessary re-renders
 * and provides error boundaries with optimized error handling
 */
const OptimizedPerformanceWrapper = memo<OptimizedPerformanceWrapperProps>(({ 
  children, 
  dependencies = [], 
  fallback, 
  onError 
}) => {
  // Create stable error handler to prevent callback recreations
  const stableErrorHandler = useStableCallback(onError || (() => {}));

  // Memoize children to prevent unnecessary re-renders
  const memoizedChildren = useMemo(() => {
    return children;
  }, dependencies);

  return (
    <SafeWrapper fallback={fallback}>
      {memoizedChildren}
    </SafeWrapper>
  );
});

OptimizedPerformanceWrapper.displayName = 'OptimizedPerformanceWrapper';

export { OptimizedPerformanceWrapper };