/**
 * System-wide performance configuration
 * Controls auto-refresh intervals and window focus behaviors to prevent performance issues
 */

export const PERFORMANCE_CONFIG = {
  // COMPLETELY DISABLE ALL AUTO-REFRESH AND MONITORING
  DISABLE_AUTO_REFRESH: true,
  DISABLE_FOCUS_REFRESH: true,
  DISABLE_REALTIME_UPDATES: true,
  DISABLE_TAB_SWITCH_REFRESH: true,
  DISABLE_PERFORMANCE_MONITORING: true, // New: Disable performance monitoring
  
  // Very long intervals to effectively disable auto-refresh
  DASHBOARD_REFRESH_INTERVAL: Number.MAX_SAFE_INTEGER,
  TAB_SWITCH_DELAY: Number.MAX_SAFE_INTEGER,
  REALTIME_DEBOUNCE_DELAY: Number.MAX_SAFE_INTEGER,
  
  // Aggressive caching
  QUERY_STALE_TIME: 30 * 60 * 1000, // 30 minutes
  QUERY_CACHE_TIME: 60 * 60 * 1000, // 1 hour
  MAX_RETRIES: 1,
  
  // Disable all refresh triggers
  DISABLE_VISIBILITY_CHANGE: true,
  DISABLE_WINDOW_FOCUS: true,
  DISABLE_NETWORK_RECONNECT: true,
  DISABLE_PERFORMANCE_LOGGING: true, // New: Disable performance logging
} as const;

/**
 * Performance optimization utilities
 */
export const performanceUtils = {
  /**
   * Checks if auto-refresh should be enabled based on performance config
   */
  shouldEnableAutoRefresh: () => false, // Always false
  
  /**
   * Checks if focus refresh should be enabled
   */
  shouldEnableFocusRefresh: () => false, // Always false
  
  /**
   * Checks if performance monitoring should be enabled
   */
  shouldEnablePerformanceMonitoring: () => false, // Always false
  
  /**
   * Gets optimized refresh interval - effectively disable all auto-refresh
   */
  getRefreshInterval: () => Number.MAX_SAFE_INTEGER, // Effectively disable
  
  /**
   * Gets debounce delay for realtime updates
   */
  getRealtimeDebounce: () => Number.MAX_SAFE_INTEGER, // Effectively disable
  
  /**
   * Performance-optimized query options with real-time caching
   */
  getQueryOptions: () => ({
    staleTime: PERFORMANCE_CONFIG.QUERY_STALE_TIME,
    gcTime: PERFORMANCE_CONFIG.QUERY_CACHE_TIME,
    retry: PERFORMANCE_CONFIG.MAX_RETRIES,
    refetchOnWindowFocus: false, // Always disabled
    refetchOnMount: false, // Prevent excessive fetching
    refetchOnReconnect: false, // Prevent network-triggered refreshes
  }),
};