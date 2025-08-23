/**
 * System-wide performance configuration
 * Controls auto-refresh intervals and window focus behaviors to prevent performance issues
 */

export const PERFORMANCE_CONFIG = {
  // Disable all auto-refresh mechanisms that cause tab switching issues
  DISABLE_AUTO_REFRESH: true,
  DISABLE_FOCUS_REFRESH: true,
  
  // Much longer intervals for stability
  DASHBOARD_REFRESH_INTERVAL: 600000, // 10 minutes
  REALTIME_DEBOUNCE_DELAY: 5000, // 5 seconds
  
  // Optimized query settings
  QUERY_STALE_TIME: 600000, // 10 minutes
  QUERY_CACHE_TIME: 1800000, // 30 minutes
  
  // Component render optimization
  RENDER_DEBOUNCE_DELAY: 500, // 500ms debounce
  
  // Network request optimization
  REQUEST_TIMEOUT: 15000, // 15 seconds
  MAX_RETRIES: 0, // No retries
  
  // Browser tab optimization - disable all tab switching logic
  TAB_SWITCH_DELAY: 0, // No delay
  
  // Memory management
  CLEANUP_INTERVAL: 1200000, // 20 minutes
  
  // New performance settings
  MAX_CONCURRENT_REQUESTS: 2, // Limit concurrent requests
  PREFETCH_THRESHOLD: 2000, // Higher threshold
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