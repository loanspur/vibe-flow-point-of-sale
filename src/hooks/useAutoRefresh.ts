import { useEffect, useRef, useCallback } from 'react';

interface AutoRefreshOptions {
  interval?: number; // Refresh interval in milliseconds
  enabled?: boolean; // Whether auto-refresh is enabled
  onRefresh?: () => void; // Callback function to execute on refresh
  visibilityBased?: boolean; // Only refresh when tab is visible
}

export const useAutoRefresh = (options: AutoRefreshOptions = {}) => {
  const {
    interval = 30000, // Default 30 seconds
    enabled = true,
    onRefresh,
    visibilityBased = true
  } = options;

  const intervalRef = useRef<NodeJS.Timeout>();
  const isVisibleRef = useRef(true);

  // Handle visibility change
  useEffect(() => {
    if (!visibilityBased) return;

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [visibilityBased]);

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (!visibilityBased || isVisibleRef.current) {
        onRefresh?.();
      }
    }, interval);
  }, [interval, onRefresh, visibilityBased]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const manualRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  useEffect(() => {
    if (enabled && onRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => stopAutoRefresh();
  }, [enabled, onRefresh, startAutoRefresh, stopAutoRefresh]);

  return {
    startAutoRefresh,
    stopAutoRefresh,
    manualRefresh
  };
};