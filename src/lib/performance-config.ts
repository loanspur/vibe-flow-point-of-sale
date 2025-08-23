/**
 * System-wide performance configuration
 * Controls auto-refresh intervals and window focus behaviors to prevent performance issues
 */

export const PERFORMANCE_CONFIG = {
  // More aggressive performance settings to prevent refresh loops
  DISABLE_AUTO_REFRESH: true,
  DISABLE_FOCUS_REFRESH: true,
  
  // Longer intervals for better stability
  DASHBOARD_REFRESH_INTERVAL: 300000, // 5 minutes - much longer for stability
  REALTIME_DEBOUNCE_DELAY: 3000, // 3 seconds debounce for better performance
  
  // Optimized query settings for faster loads  
  QUERY_STALE_TIME: 300000, // 5 minutes - longer cache for better performance
  QUERY_CACHE_TIME: 900000, // 15 minutes cache time
  
  // Component render optimization
  RENDER_DEBOUNCE_DELAY: 200, // 200ms debounce for renders
  
  // Network request optimization
  REQUEST_TIMEOUT: 10000, // Reduced to 10 seconds for faster perceived performance
  MAX_RETRIES: 0, // No retries to prevent hanging
  
  // Browser tab optimization
  TAB_SWITCH_DELAY: 500, // Shorter delay but still prevent rapid switches
  
  // Memory management
  CLEANUP_INTERVAL: 600000, // 10 minutes cleanup interval
  
  // New performance settings
  MAX_CONCURRENT_REQUESTS: 3, // Limit concurrent requests
  PREFETCH_THRESHOLD: 1000, // Threshold for prefetching
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
   * Gets optimized refresh interval - much longer for stability
   */
  getRefreshInterval: (defaultInterval: number = 30000) => {
    return PERFORMANCE_CONFIG.DISABLE_AUTO_REFRESH 
      ? Number.MAX_SAFE_INTEGER // Effectively disable all auto-refresh
      : Math.max(defaultInterval, PERFORMANCE_CONFIG.DASHBOARD_REFRESH_INTERVAL);
  },
  
  /**
   * Gets debounce delay for realtime updates
   */
  getRealtimeDebounce: () => PERFORMANCE_CONFIG.REALTIME_DEBOUNCE_DELAY,
  
  /**
   * Performance-optimized query options with aggressive caching
   */
  getQueryOptions: () => ({
    staleTime: PERFORMANCE_CONFIG.QUERY_STALE_TIME,
    gcTime: PERFORMANCE_CONFIG.QUERY_CACHE_TIME,
    retry: PERFORMANCE_CONFIG.MAX_RETRIES,
    refetchOnWindowFocus: false, // Always disabled for performance
    refetchOnMount: false, // Prevent excessive fetching on component mount
    refetchOnReconnect: false, // Prevent network-triggered refreshes
  }),
};