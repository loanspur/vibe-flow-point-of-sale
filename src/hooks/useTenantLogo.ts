import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BUSINESS_CONFIG } from '@/lib/business-config';

export function useTenantLogo() {
  const { settings } = useBusinessSettingsManager();
  return settings?.company_logo_url || null;
}
