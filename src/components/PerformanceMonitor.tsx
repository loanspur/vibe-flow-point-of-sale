import { useEffect } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  route: string;
}

export const PerformanceMonitor = () => {
  useEffect(() => {
    // COMPLETELY DISABLED: Performance monitoring to prevent overhead
    // This was causing false slow page load warnings
    console.log('PerformanceMonitor completely disabled to prevent overhead');
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;