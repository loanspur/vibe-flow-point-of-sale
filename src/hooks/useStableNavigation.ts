import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { tabStabilityManager } from '@/lib/tab-stability-manager';

/**
 * Stable navigation hook that prevents navigation during tab switching
 * and uses React Router instead of window.location methods
 */
export function useStableNavigation() {
  const navigate = useNavigate();

  const stableNavigate = useCallback((to: string, options?: { replace?: boolean }) => {
    // Don't navigate if we're in the middle of tab switching
    if (tabStabilityManager.isCurrentlyTabSwitching()) {
      console.log('Navigation prevented during tab switching');
      return;
    }

    navigate(to, options);
  }, [navigate]);

  const safeReplace = useCallback((to: string) => {
    stableNavigate(to, { replace: true });
  }, [stableNavigate]);

  const preventWindowLocationChanges = useCallback((url: string) => {
    // Instead of window.location.href or window.location.replace, use React Router
    console.warn('Preventing window.location change, using React Router instead:', url);
    
    if (url.startsWith('http') && !url.includes(window.location.origin)) {
      // External URL - allow it
      window.location.href = url;
    } else {
      // Internal URL - use React Router
      const path = url.replace(window.location.origin, '');
      stableNavigate(path);
    }
  }, [stableNavigate]);

  return {
    navigate: stableNavigate,
    replace: safeReplace,
    safeExternalRedirect: preventWindowLocationChanges,
  };
}