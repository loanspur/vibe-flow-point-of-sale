import { useEffect } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  route: string;
}

export const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run performance monitoring in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Simplified performance monitoring with minimal overhead
    const measureLoadPerformance = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        
        // Only log if significantly slow
        if (loadTime > 5000) {
          console.warn('Slow page load detected:', `${loadTime.toFixed(2)}ms`);
        }
      }
    };

    // Wait for page to fully load before measuring
    if (document.readyState === 'complete') {
      measureLoadPerformance();
    } else {
      window.addEventListener('load', measureLoadPerformance, { once: true });
    }

    return () => {
      window.removeEventListener('load', measureLoadPerformance);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;