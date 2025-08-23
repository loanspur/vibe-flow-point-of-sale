import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BUSINESS_CONFIG } from '@/lib/business-config';
import { useBusinessSettingsManager } from './useBusinessSettingsManager';

export function useTenantLogo() {
  const { user } = useAuth();
  const profile = user?.user_metadata;
  const tenantId = profile?.tenant_id;
  const { settings } = useBusinessSettingsManager(tenantId);

  return settings?.company_logo_url || null;
}
