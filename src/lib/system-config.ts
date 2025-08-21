/**
 * Centralized system configuration for dynamic values and timeouts
 * Replaces hard-coded values throughout the application
 */

export const SYSTEM_CONFIG = {
  // Authentication & Session
  AUTH_TIMEOUT: 5000,
  SESSION_REFRESH_INTERVAL: 30000,
  
  // Performance & Timeouts
  DEFAULT_DEBOUNCE_DELAY: 300,
  FAST_DEBOUNCE_DELAY: 100,
  SLOW_DEBOUNCE_DELAY: 500,
  DATABASE_OPERATION_DELAY: 1000,
  REQUEST_TIMEOUT: 15000,
  
  // UI & UX
  NOTIFICATION_DURATION: 3000,
  AUTO_REFRESH_INTERVAL: 30000,
  REALTIME_REFRESH_DELAY: 1000,
  SEARCH_DEBOUNCE_DELAY: 300,
  
  // Business Logic
  DEFAULT_PAGE_SIZE: 50,
  MAX_BULK_OPERATIONS: 100,
  RETRY_ATTEMPTS: 3,
  
  // Development
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  ENABLE_CONSOLE_LOGS: process.env.NODE_ENV === 'development',
} as const;

/**
 * System utilities for consistent behavior
 */
export const systemUtils = {
  /**
   * Get debounce delay based on operation type
   */
  getDebounceDelay: (type: 'fast' | 'default' | 'slow' = 'default') => {
    switch (type) {
      case 'fast': return SYSTEM_CONFIG.FAST_DEBOUNCE_DELAY;
      case 'slow': return SYSTEM_CONFIG.SLOW_DEBOUNCE_DELAY;
      default: return SYSTEM_CONFIG.DEFAULT_DEBOUNCE_DELAY;
    }
  },

  /**
   * Create a promise delay with consistent timing
   */
  delay: (ms?: number) => new Promise(resolve => 
    setTimeout(resolve, ms || SYSTEM_CONFIG.DEFAULT_DEBOUNCE_DELAY)
  ),

  /**
   * Standardized logging that respects environment
   */
  log: {
    info: (message: string, data?: any) => {
      if (SYSTEM_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.info(message, data);
      }
    },
    error: (message: string, error?: any) => {
      if (SYSTEM_CONFIG.LOG_LEVEL === 'debug' || SYSTEM_CONFIG.LOG_LEVEL === 'error') {
        console.error(message, error);
      }
    },
    warn: (message: string, data?: any) => {
      if (SYSTEM_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.warn(message, data);
      }
    }
  }
};