import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FeatureFlag {
  feature_name: string;
  is_enabled: boolean;
  config: Record<string, any>;
}

interface UseFeatureFlagsReturn {
  isFeatureEnabled: (featureName: string) => boolean;
  getFeatureConfig: (featureName: string) => Record<string, any>;
  enabledFeatures: FeatureFlag[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFeatureFlags(): UseFeatureFlagsReturn {
  const [enabledFeatures, setEnabledFeatures] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnabledFeatures = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase.rpc('get_enabled_features');
      
      if (fetchError) throw fetchError;
      
      setEnabledFeatures(data || []);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError('Failed to load feature flags');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnabledFeatures();
  }, []);

  const isFeatureEnabled = (featureName: string): boolean => {
    return enabledFeatures.some(feature => 
      feature.feature_name === featureName && feature.is_enabled
    );
  };

  const getFeatureConfig = (featureName: string): Record<string, any> => {
    const feature = enabledFeatures.find(f => f.feature_name === featureName);
    return feature?.config || {};
  };

  const refresh = async () => {
    setIsLoading(true);
    await fetchEnabledFeatures();
  };

  return {
    isFeatureEnabled,
    getFeatureConfig,
    enabledFeatures,
    isLoading,
    error,
    refresh,
  };
}

// Convenience hook for checking a single feature
export function useFeatureFlag(featureName: string): boolean {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(featureName);
}

// Hook for getting feature configuration
export function useFeatureConfig(featureName: string): Record<string, any> {
  const { getFeatureConfig } = useFeatureFlags();
  return getFeatureConfig(featureName);
}
