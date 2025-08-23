import { useEffect } from 'react';

/**
 * Simplified app optimizer - only handles essential performance optimizations
 */
export function AppOptimizer() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Prevent aggressive scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Disable all window focus and visibility event handlers
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
      // Block problematic event listeners
      if (type === 'focus' || type === 'blur' || type === 'visibilitychange') {
        console.warn('Blocked event listener:', type);
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    return () => {
      // Restore default scroll restoration
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
      
      // Restore original addEventListener
      window.addEventListener = originalAddEventListener;
    };
  }, []);

  return null;
}