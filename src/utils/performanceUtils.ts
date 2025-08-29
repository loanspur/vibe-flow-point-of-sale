/**
 * Performance utilities for optimizing React applications
 */

// Debounce function to limit how often a function can be called
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function to limit function execution rate
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoize expensive calculations
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Batch DOM updates to prevent layout thrashing
export function batchDOMUpdates(updates: (() => void)[]): void {
  if (typeof window === 'undefined') {
    updates.forEach(update => update());
    return;
  }

  // Use requestAnimationFrame for smooth updates
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

// Measure performance of a function
export function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  name: string = 'Function'
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${name} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
}

// Check if component should re-render based on props
export function shouldComponentUpdate<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keysToCompare: (keyof T)[] = Object.keys(prevProps) as (keyof T)[]
): boolean {
  return keysToCompare.some(key => prevProps[key] !== nextProps[key]);
}

// Lazy load components with loading state
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): React.LazyExoticComponent<T> {
  return React.lazy(() => 
    importFunc().then(module => ({
      default: module.default
    }))
  );
}

// Optimize images with intersection observer
export function createImageObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  });
}

// Prevent memory leaks by cleaning up resources
export function createCleanupManager() {
  const cleanups: (() => void)[] = [];
  
  return {
    add: (cleanup: () => void) => {
      cleanups.push(cleanup);
    },
    cleanup: () => {
      cleanups.forEach(cleanup => cleanup());
      cleanups.length = 0;
    }
  };
}

// Optimize scroll events
export function createScrollOptimizer(
  callback: (scrollTop: number) => void,
  throttleMs: number = 16
): (event: Event) => void {
  let ticking = false;
  
  return (event: Event) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = (event.target as Element)?.scrollTop || 0;
        callback(scrollTop);
        ticking = false;
      });
      ticking = true;
    }
  };
}

// Cache API responses
export function createAPICache<T>(
  ttl: number = 5 * 60 * 1000 // 5 minutes
) {
  const cache = new Map<string, { data: T; timestamp: number }>();
  
  return {
    get: (key: string): T | null => {
      const item = cache.get(key);
      if (!item) return null;
      
      if (Date.now() - item.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      
      return item.data;
    },
    set: (key: string, data: T) => {
      cache.set(key, { data, timestamp: Date.now() });
    },
    clear: () => cache.clear(),
    delete: (key: string) => cache.delete(key)
  };
}

// Monitor memory usage
export function monitorMemoryUsage(): void {
  if (typeof window === 'undefined' || !('memory' in performance)) return;
  
  const memory = (performance as any).memory;
  const used = memory.usedJSHeapSize / 1024 / 1024;
  const total = memory.totalJSHeapSize / 1024 / 1024;
  const limit = memory.jsHeapSizeLimit / 1024 / 1024;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Memory: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB (${limit.toFixed(2)}MB limit)`);
  }
  
  // Warn if memory usage is high
  if (used / limit > 0.8) {
    console.warn('High memory usage detected');
  }
}

// Optimize list rendering with virtualization helpers
export function createVirtualizationHelpers(
  itemHeight: number,
  containerHeight: number
) {
  return {
    getVisibleRange: (scrollTop: number) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 1,
        Number.MAX_SAFE_INTEGER
      );
      return { startIndex, endIndex };
    },
    getTotalHeight: (itemCount: number) => itemCount * itemHeight,
    getItemOffset: (index: number) => index * itemHeight
  };
}
