import { useEffect, useRef, useCallback } from 'react';

interface AutoRefreshOptions {
  interval?: number; // Refresh interval in milliseconds
  enabled?: boolean; // Whether auto-refresh is enabled
  onRefresh?: () => void; // Callback function to execute on refresh
  visibilityBased?: boolean; // Only refresh when tab is visible
}

/**
 * COMPLETELY DISABLED: Auto-refresh hook to prevent unwanted refreshes
 * This hook is completely disabled to prevent flickering and auto-refreshes
 */
export function useAutoRefresh(options: AutoRefreshOptions = {}) {
  const { enabled = false, interval = 30000, onRefresh, visibilityBased = false } = options;
  
  // COMPLETELY DISABLED - No auto-refresh functionality
  console.log('Auto-refresh hook completely disabled to prevent refresh triggers');
  
  // Return no-op functions
  return {
    isEnabled: false,
    enable: () => console.log('Auto-refresh disabled'),
    disable: () => console.log('Auto-refresh disabled'),
    refresh: () => console.log('Auto-refresh disabled'),
  };
}