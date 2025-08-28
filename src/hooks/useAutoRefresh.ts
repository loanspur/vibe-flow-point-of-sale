import { useEffect, useRef, useCallback } from 'react';

interface AutoRefreshOptions {
  interval?: number; // Refresh interval in milliseconds
  enabled?: boolean; // Whether auto-refresh is enabled
  onRefresh?: () => void; // Callback function to execute on refresh
  visibilityBased?: boolean; // Only refresh when tab is visible
}

/**
 * DISABLED: Auto-refresh hook to prevent unwanted refreshes
 * This hook is completely disabled to prevent flickering and auto-refreshes
 */
export const useAutoRefresh = (options: AutoRefreshOptions = {}) => {
  // Completely disabled to prevent auto-refreshes
  console.log('Auto-refresh disabled to prevent unwanted refreshes');

  const manualRefresh = useCallback(() => {
    // Only allow manual refresh when explicitly called
    options.onRefresh?.();
  }, [options.onRefresh]);

  return {
    startAutoRefresh: () => {}, // No-op
    stopAutoRefresh: () => {}, // No-op
    manualRefresh
  };
};