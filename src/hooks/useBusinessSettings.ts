import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettingsManager } from './useBusinessSettingsManager';

/**
 * Unified hook for accessing business settings across the application
 * This ensures consistent access to configuration flags and reduces code duplication
 */
export const useBusinessSettings = () => {
  const { user } = useAuth();
  const profile = user?.user_metadata;
  const tenantId = profile?.tenant_id;
  const { settings } = useBusinessSettingsManager(tenantId);

  return {
    settings,
    raw: settings,
  };
};