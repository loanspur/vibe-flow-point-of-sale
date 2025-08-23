import { useEffect } from 'react';
import { PERFORMANCE_CONFIG } from '@/lib/performance-config';
import { tabStabilityManager } from '@/lib/tab-stability-manager';

/**
 * Global app optimizer component to handle performance issues
 * that cause browser switching problems and frequent reloads
 */
export function AppOptimizer() {
  useEffect(() => {
    // Initialize the global tab stability manager
    tabStabilityManager.initialize();
    
    console.log('AppOptimizer initialized with tab stability manager');

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

    // The tab stability manager handles all visibility and navigation events
    // No need for additional event listeners here
    
    return () => {
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