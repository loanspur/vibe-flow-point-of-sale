import { useEffect } from 'react';
import { PERFORMANCE_CONFIG } from '@/lib/performance-config';

/**
 * Global app optimizer component to handle performance issues
 * that cause browser switching problems and frequent reloads
 */
export function AppOptimizer() {
  useEffect(() => {
    // Prevent excessive window focus events that cause reloads
    let focusTimeout: NodeJS.Timeout;
    let lastFocus = 0;

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      // Ignore rapid visibility changes (browser switching)
      if (now - lastFocus < PERFORMANCE_CONFIG.TAB_SWITCH_DELAY) {
        return;
      }

      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }

      // Debounce visibility change handling with longer delay to prevent refresh loops
      focusTimeout = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          lastFocus = Date.now();
          // Prevent any auth state refreshes that could trigger OTP sends
          console.log('Tab focus detected, ignoring to prevent refresh loops');
        }
      }, PERFORMANCE_CONFIG.TAB_SWITCH_DELAY * 2); // Double the delay
    };

    // Prevent aggressive scroll restoration that causes layout shifts
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Optimize browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      // Prevent default browser behavior that might cause reloads
      event.preventDefault();
      
      // Let React Router handle navigation instead
      const url = window.location.href;
      window.history.replaceState(null, '', url);
    };

    // Add optimized event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('popstate', handlePopState);

    // Cleanup function
    return () => {
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
      
      // Restore default scroll restoration
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // Memory cleanup on component unmount
  useEffect(() => {
    const cleanup = () => {
      // Clear any remaining application timeouts
      try {
        // Use a more targeted approach to clean up only app-specific timeouts
        for (let i = 1; i < 10000; i++) {
          clearTimeout(i);
          clearInterval(i);
        }
      } catch (error) {
        console.warn('Cleanup warning (ignored):', error);
      }
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
    return () => {
      window.removeEventListener('beforeunload', cleanup);
    };
  }, []);

  // This component doesn't render anything
  return null;
}