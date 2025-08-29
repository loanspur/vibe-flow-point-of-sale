/**
 * System-wide performance configuration
 * Controls auto-refresh intervals and window focus behaviors to prevent performance issues
 */

export const PERFORMANCE_CONFIG = {
  // Enable real-time updates for dashboard data
  DISABLE_AUTO_REFRESH: false, // Enable auto-refresh for real-time data
  DISABLE_FOCUS_REFRESH: false, // Enable focus refresh for better UX
  
  // Optimized intervals for real-time dashboard updates
  DASHBOARD_REFRESH_INTERVAL: 30000, // 30 seconds - reasonable for real-time updates
  REALTIME_DEBOUNCE_DELAY: 1000, // 1 second debounce - faster real-time updates
  
  // Optimized query settings for faster loads  
  QUERY_STALE_TIME: 60000, // 1 minute - shorter for more frequent updates
  QUERY_CACHE_TIME: 300000, // 5 minutes cache time
  
  // Component render optimization
  RENDER_DEBOUNCE_DELAY: 200, // 200ms debounce for renders
  
  // Network request optimization
  REQUEST_TIMEOUT: 10000, // 10 seconds for faster perceived performance
  MAX_RETRIES: 1, // Allow 1 retry for reliability
  
  // Browser tab optimization
  TAB_SWITCH_DELAY: 500, // Shorter delay but still prevent rapid switches
  
  // Memory management
  CLEANUP_INTERVAL: 600000, // 10 minutes cleanup interval
  
  // New performance settings
  MAX_CONCURRENT_REQUESTS: 5, // Increased for dashboard parallel queries
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
   * Gets optimized refresh interval for real-time updates
   */
  getRefreshInterval: (defaultInterval: number = 30000) => {
    return PERFORMANCE_CONFIG.DISABLE_AUTO_REFRESH 
      ? Number.MAX_SAFE_INTEGER // Effectively disable all auto-refresh
      : Math.min(defaultInterval, PERFORMANCE_CONFIG.DASHBOARD_REFRESH_INTERVAL);
  },
  
  /**
   * Gets debounce delay for realtime updates
   */
  getRealtimeDebounce: () => PERFORMANCE_CONFIG.REALTIME_DEBOUNCE_DELAY,
  
  /**
   * Performance-optimized query options with real-time caching
   */
  getQueryOptions: () => ({
    staleTime: PERFORMANCE_CONFIG.QUERY_STALE_TIME,
    gcTime: PERFORMANCE_CONFIG.QUERY_CACHE_TIME,
    retry: PERFORMANCE_CONFIG.MAX_RETRIES,
    refetchOnWindowFocus: PERFORMANCE_CONFIG.DISABLE_FOCUS_REFRESH ? false : true, // Enable focus refresh
    refetchOnMount: true, // Allow refetch on mount for fresh data
    refetchOnReconnect: true, // Enable reconnect refresh for reliability
  }),
};