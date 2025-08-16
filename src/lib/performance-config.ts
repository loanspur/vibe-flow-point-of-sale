/**
 * System-wide performance configuration
 * Controls auto-refresh intervals and window focus behaviors to prevent performance issues
 */

export const PERFORMANCE_CONFIG = {
  // Disable aggressive auto-refresh to prevent flickering and high CPU usage
  DISABLE_AUTO_REFRESH: true,
  
  // Disable window focus refresh to prevent constant reloads when switching tabs
  DISABLE_FOCUS_REFRESH: true,
  
  // Increased intervals for better performance
  DASHBOARD_REFRESH_INTERVAL: 120000, // 2 minutes instead of 30 seconds
  REALTIME_DEBOUNCE_DELAY: 2000, // 2 seconds debounce for realtime updates
  
  // Query optimization settings
  QUERY_STALE_TIME: 60000, // 1 minute
  QUERY_CACHE_TIME: 300000, // 5 minutes
  
  // Component render optimization
  RENDER_DEBOUNCE_DELAY: 100, // 100ms debounce for renders
  
  // Network request optimization
  REQUEST_TIMEOUT: 15000, // 15 seconds timeout
  MAX_RETRIES: 1, // Reduced retries to prevent hanging
  
  // Browser tab optimization
  TAB_SWITCH_DELAY: 1000, // Delay before processing tab focus events
  
  // Memory management
  CLEANUP_INTERVAL: 300000, // 5 minutes cleanup interval
} as const;

/**
 * Performance optimization utilities
 */
export const performanceUtils = {
  /**
   * Checks if auto-refresh should be enabled based on performance config
   */
  shouldEnableAutoRefresh: () => !PERFORMANCE_CONFIG.DISABLE_AUTO_REFRESH,
  
  /**
   * Checks if focus refresh should be enabled
   */
  shouldEnableFocusRefresh: () => !PERFORMANCE_CONFIG.DISABLE_FOCUS_REFRESH,
  
  /**
   * Gets optimized refresh interval
   */
  getRefreshInterval: (defaultInterval: number = 30000) => {
    return PERFORMANCE_CONFIG.DISABLE_AUTO_REFRESH 
      ? Number.MAX_SAFE_INTEGER // Effectively disable
      : Math.max(defaultInterval, PERFORMANCE_CONFIG.DASHBOARD_REFRESH_INTERVAL);
  },
  
  /**
   * Gets debounce delay for realtime updates
   */
  getRealtimeDebounce: () => PERFORMANCE_CONFIG.REALTIME_DEBOUNCE_DELAY,
  
  /**
   * Performance-optimized query options
   */
  getQueryOptions: () => ({
    staleTime: PERFORMANCE_CONFIG.QUERY_STALE_TIME,
    gcTime: PERFORMANCE_CONFIG.QUERY_CACHE_TIME,
    retry: PERFORMANCE_CONFIG.MAX_RETRIES,
    refetchOnWindowFocus: false, // Always disabled for performance
  }),
};