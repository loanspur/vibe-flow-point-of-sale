import { useEffect } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  route: string;
}

export const PerformanceMonitor = () => {
  useEffect(() => {
    // Monitor initial page load performance
    const measureLoadPerformance = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const renderTime = navigation.loadEventEnd - navigation.responseEnd;

        console.log('Performance Metrics:', {
          loadTime: `${loadTime.toFixed(2)}ms`,
          renderTime: `${renderTime.toFixed(2)}ms`,
          route: window.location.pathname
        });

        // Log slow loading warnings
        if (loadTime > 3000) {
          console.warn('Slow page load detected:', `${loadTime.toFixed(2)}ms`);
        }
      }
    };

    // Monitor route changes and React renders
    const measureReactPerformance = () => {
      if ('performance' in window && 'measure' in performance) {
        try {
          performance.mark('react-render-start');
          
          setTimeout(() => {
            performance.mark('react-render-end');
            performance.measure('react-render', 'react-render-start', 'react-render-end');
            
            const measures = performance.getEntriesByName('react-render');
            if (measures.length > 0) {
              const renderTime = measures[measures.length - 1].duration;
              if (renderTime > 1000) {
                console.warn('Slow React render detected:', `${renderTime.toFixed(2)}ms`);
              }
            }
          }, 0);
        } catch (error) {
          // Silently handle performance API errors
        }
      }
    };

    // Wait for page to fully load before measuring
    if (document.readyState === 'complete') {
      measureLoadPerformance();
    } else {
      window.addEventListener('load', measureLoadPerformance);
    }

    measureReactPerformance();

    return () => {
      window.removeEventListener('load', measureLoadPerformance);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;