/**
 * Navigation utilities to prevent page reloads and handle routing consistently
 */

import { isDevelopmentDomain } from './env-guards';

// Prevent window.location.reload usage
export function safeNavigate(url: string, replace = false) {
  if (typeof window !== 'undefined') {
    if (replace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
    // Trigger navigation event
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

// Safe redirect for external URLs only
export function safeRedirect(url: string) {
  if (typeof window !== 'undefined') {
    // Only allow external redirects
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.location.href = url;
    } else {
      console.warn('Use React Router navigation for internal routes:', url);
      safeNavigate(url);
    }
  }
}

// Refresh data without page reload
export function refreshData(callbacks: (() => void | Promise<void>)[]) {
  callbacks.forEach(callback => {
    try {
      const result = callback();
      if (result instanceof Promise) {
        result.catch(console.error);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  });
}

// Get current domain safely
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return '';
}

// Check if we're on a specific domain
export function isDomain(domain: string): boolean {
  return getCurrentDomain() === domain;
}

// Get full URL safely
export function getCurrentUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  return '';
}

// Parse query parameters
export function getQueryParams(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  return {};
}

// Update query parameters without reload
export function updateQueryParams(params: Record<string, string | null>) {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    window.history.replaceState(null, '', url.toString());
  }
}

// Safe page reload only when absolutely necessary (deprecated - use state updates instead)
export function forceReload(reason: string) {
  console.warn(`Force reload deprecated: ${reason} - use state updates instead`);
  // Instead of reloading, dispatch a custom event for components to handle
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:force-refresh', { detail: { reason } }));
  }
}

// Clear cache without reload (emergency use only)
export async function emergencyCacheClear(reason: string) {
  console.error(`Emergency cache clear triggered: ${reason}`);
  
  if (typeof window !== 'undefined') {
    try {
      // Clear caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage specific to app
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('vibepos-') || key.startsWith('supabase.')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Dispatch event for components to refresh their state
      window.dispatchEvent(new CustomEvent('app:cache-cleared', { detail: { reason } }));
      
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Check if navigation is needed based on auth state
export function shouldRedirectForAuth(isAuthenticated: boolean, currentPath: string): string | null {
  const publicPaths = ['/auth', '/signup', '/forgot-password', '/reset-password', '/', '/privacy', '/terms'];
  const isPublicPath = publicPaths.includes(currentPath) || currentPath.startsWith('/public');
  
  if (!isAuthenticated && !isPublicPath) {
    return '/auth';
  }
  
  if (isAuthenticated && currentPath === '/auth') {
    return '/dashboard';
  }
  
  return null;
}

// Handle tenant domain redirects
export function handleTenantRedirect(tenantDomain: string | null, currentDomain: string) {
  if (!tenantDomain) return;
  
  const targetDomain = `${tenantDomain}.vibenet.shop`;
  
  // Only redirect if we're not already on the correct domain
  if (currentDomain !== targetDomain && !isDevelopmentDomain(currentDomain)) {
    safeRedirect(`https://${targetDomain}/dashboard`);
  }
}

// Centralized post-auth redirect helper
export function getPostAuthRedirect(
  userRole: string | null,
  domainConfig: { isSubdomain: boolean; tenantId?: string | null },
  profileTenantId: string | null,
  tenantSubdomain?: string | null
): string {
  const roleLower = (userRole || '').toLowerCase();
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const apex = hostname.includes('vibenet.online') ? 'vibenet.online' : 'vibenet.shop';

  // Superadmin should land on apex /superadmin
  if (roleLower === 'superadmin') {
    return `https://${apex}/superadmin`;
  }

  // Tenant user on correct subdomain
  if (profileTenantId && domainConfig.isSubdomain && domainConfig.tenantId === profileTenantId) {
    return '/dashboard';
  }

  // Tenant user on main domain -> redirect to subdomain
  if (profileTenantId && !domainConfig.isSubdomain && tenantSubdomain) {
    return `https://${tenantSubdomain}.${apex}/dashboard`;
  }

  // Tenant user on wrong subdomain -> redirect to correct one if known
  if (profileTenantId && domainConfig.isSubdomain && tenantSubdomain) {
    return `https://${tenantSubdomain}.${apex}/dashboard`;
  }

  // Default fallback
  return '/dashboard';
}

// Breadcrumb utilities
export function generateBreadcrumbs(path: string): Array<{ label: string; path: string }> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ label: 'Dashboard', path: '/dashboard' }];
  
  let currentPath = '';
  segments.forEach(segment => {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    breadcrumbs.push({ label, path: currentPath });
  });
  
  return breadcrumbs;
}

// Deep link handlers
export function createDeepLink(path: string, params?: Record<string, string>): string {
  const url = new URL(path, window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

// Navigation analytics
export function trackNavigation(from: string, to: string, method: 'click' | 'programmatic' | 'browser') {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Navigation: ${from} -> ${to} (${method})`);
  }
  
  // Add analytics tracking here
}