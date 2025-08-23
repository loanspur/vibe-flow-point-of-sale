import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { handleError } from '@/utils/errorHandler';
import { debugLog } from '@/utils/debug';

export const useAccountManagement = () => {
  const { tenantId } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAccounts = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          code,
          name,
          balance,
          is_active,
          account_types (
            name,
            category
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      handleError(error, 'useAccountManagement.fetchAccounts');
    } finally {
      setLoading(false);
    }
  };

  return { accounts, loading, fetchAccounts };
};
