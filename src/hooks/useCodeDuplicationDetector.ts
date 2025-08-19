import { useEffect, useRef } from 'react';

/**
 * Hook to detect potential code duplication issues that cause performance problems
 */
export function useCodeDuplicationDetector(componentName: string) {
  const mountCountRef = useRef(0);
  const lastMountRef = useRef(0);

  useEffect(() => {
    mountCountRef.current++;
    const now = Date.now();
    
    // Check for rapid remounting (potential duplication issue)
    if (now - lastMountRef.current < 100 && mountCountRef.current > 1) {
      console.warn(`⚠️ Potential duplication detected: ${componentName} mounted ${mountCountRef.current} times rapidly`);
    }
    
    lastMountRef.current = now;

    // Cleanup detection
    return () => {
      // Reset on unmount if this is the last instance
      setTimeout(() => {
        if (mountCountRef.current > 0) {
          mountCountRef.current--;
        }
      }, 1000);
    };
  }, [componentName]);

  return {
    mountCount: mountCountRef.current,
    isLikelyDuplicated: mountCountRef.current > 1
  };
}