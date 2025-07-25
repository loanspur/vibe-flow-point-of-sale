import React, { useMemo } from 'react';
import { useFeatureAccess } from './useFeatureAccess';

interface FeatureGuardOptions {
  feature: string;
  fallbackComponent?: React.ComponentType;
  fallbackMessage?: string;
  showUpgrade?: boolean;
}

interface FeatureGuardResult {
  hasAccess: boolean;
  isLoading: boolean;
  renderFeature: (children: React.ReactNode) => React.ReactNode;
  checkAccess: () => boolean;
  accessLevel: 'granted' | 'denied' | 'upgrade_required' | 'loading';
}

export function useFeatureGuard(options: FeatureGuardOptions): FeatureGuardResult {
  const { feature, fallbackComponent: FallbackComponent, fallbackMessage, showUpgrade = true } = options;
  const { hasFeature, loading } = useFeatureAccess();
  const hasAccess = hasFeature(feature);
  const requiresUpgrade = !hasAccess;

  const accessLevel = useMemo(() => {
    if (loading) return 'loading';
    if (hasAccess) return 'granted';
    if (requiresUpgrade) return 'upgrade_required';
    return 'denied';
  }, [hasAccess, loading, requiresUpgrade]);

  const renderFeature = useMemo(() => {
    return (children: React.ReactNode) => {
      if (loading) {
        return children; // Return loading state or children
      }

      if (!hasAccess) {
        if (FallbackComponent) {
          return React.createElement(FallbackComponent);
        }
        return null; // Return null for restricted access
      }

      return children;
    };
  }, [hasAccess, loading, FallbackComponent]);

  const checkAccess = useMemo(() => {
    return () => hasAccess && !loading;
  }, [hasAccess, loading]);

  return {
    hasAccess: hasAccess && !loading,
    isLoading: loading,
    renderFeature,
    checkAccess,
    accessLevel
  };
}