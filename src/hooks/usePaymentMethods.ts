import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  name: string;
  type: "cash" | "card" | "mobile_money" | "bank_transfer" | "crypto" | "other";
  account_id?: string;
  account_name?: string;
  account_code?: string;
  is_active: boolean;
  requires_reference: boolean;
  description?: string;
  processing_fee_percentage?: number;
  minimum_amount?: number;
  maximum_amount?: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AssetAccount {
  id: string;
  name: string;
  code: string;
  category: string;
}

export function usePaymentMethods() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment methods with account information
  const fetchPaymentMethods = useCallback(async () => {
    if (!tenantId) {
      setPaymentMethods([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');

      if (fetchError) {
        console.error('Error fetching payment methods:', fetchError);
        throw fetchError;
      }
      
      // Enhance payment methods with account information
      const enhancedMethods = await Promise.all(
        (data || []).map(async (method: any) => {
          let account_name = '';
          let account_code = '';
          
          if (method.account_id) {
            try {
              const { data: accountData } = await supabase
                .from('accounts')
                .select('name, code')
                .eq('id', method.account_id)
                .maybeSingle();
                
              if (accountData) {
                account_name = accountData.name;
                account_code = accountData.code;
              }
            } catch (accountError) {
              console.warn('Could not fetch account info for payment method:', method.id, accountError);
              // Continue without account info
            }
          }
          
          return {
            ...method,
            account_name,
            account_code,
          };
        })
      );
      
      setPaymentMethods(enhancedMethods);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: 'Error',
        description: `Failed to fetch payment methods: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Fetch asset accounts for payment method linking
  const fetchAssetAccounts = useCallback(async () => {
    if (!tenantId) {
      setAssetAccounts([]);
      return;
    }

    try {
      // First try to fetch with the complex join
      let { data, error: fetchError } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          code,
          account_types!inner(category)
        `)
        .eq('tenant_id', tenantId)
        .eq('account_types.category', 'assets')
        .eq('is_active', true)
        .order('code');

      if (fetchError) {
        console.log('Complex join failed, trying simple select:', fetchError);
        // Fallback to simple select if the join fails
        const simpleResult = await supabase
          .from('accounts')
          .select('id, name, code')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('code');
          
        if (simpleResult.error) {
          console.log('Simple select also failed, accounts table may not exist:', simpleResult.error);
          setAssetAccounts([]);
          return;
        }
        
        data = simpleResult.data as any;
      }
      
      const formattedAccounts = (data || []).map((account: any) => ({
        id: account.id,
        name: account.name,
        code: account.code,
        category: account.account_types?.category || 'assets'
      }));
      
      setAssetAccounts(formattedAccounts);
    } catch (err) {
      console.error('Error fetching asset accounts:', err);
      // Don't show error toast for asset accounts as they're optional
      setAssetAccounts([]);
    }
  }, [tenantId]);

  // Get active payment methods only
  const getActivePaymentMethods = useCallback(() => {
    return paymentMethods.filter(method => method.is_active);
  }, [paymentMethods]);

  // Get payment methods by type
  const getPaymentMethodsByType = useCallback((type: string) => {
    return paymentMethods.filter(method => method.type === type && method.is_active);
  }, [paymentMethods]);

  // Get default payment methods (fallback)
  const getDefaultPaymentMethods = useCallback(() => {
    return [
      { id: 'default-cash', name: 'Cash', type: 'cash', is_active: true, requires_reference: false, display_order: 1 },
      { id: 'default-card', name: 'Credit/Debit Card', type: 'card', is_active: true, requires_reference: true, display_order: 2 },
      { id: 'default-bank', name: 'Bank Transfer', type: 'bank_transfer', is_active: true, requires_reference: true, display_order: 3 }
    ] as PaymentMethod[];
  }, []);

  // Save payment method
  const savePaymentMethod = useCallback(async (paymentMethodData: Partial<PaymentMethod>, isUpdate = false) => {
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      const dataToSave = {
        ...paymentMethodData,
        tenant_id: tenantId,
      };

      // Remove undefined values
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key as keyof typeof dataToSave] === undefined) {
          delete dataToSave[key as keyof typeof dataToSave];
        }
      });

      let result;
      if (isUpdate && paymentMethodData.id) {
        result = await supabase
          .from('payment_methods')
          .update(dataToSave)
          .eq('id', paymentMethodData.id)
          .eq('tenant_id', tenantId)
          .select();
      } else {
        result = await supabase
          .from('payment_methods')
          .insert([dataToSave])
          .select();
      }

      if (result.error) {
        console.error('Save error:', result.error);
        throw result.error;
      }

      // Refresh the payment methods list
      await fetchPaymentMethods();

      return result.data?.[0];
    } catch (err) {
      console.error('Error saving payment method:', err);
      throw err;
    }
  }, [tenantId, fetchPaymentMethods]);

  // Delete payment method
  const deletePaymentMethod = useCallback(async (id: string) => {
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Refresh the payment methods list
      await fetchPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      throw err;
    }
  }, [tenantId, fetchPaymentMethods]);

  // Initialize data
  useEffect(() => {
    if (tenantId) {
      fetchPaymentMethods();
      fetchAssetAccounts();
    }
  }, [tenantId, fetchPaymentMethods, fetchAssetAccounts]);

  return {
    paymentMethods,
    assetAccounts,
    loading,
    error,
    fetchPaymentMethods,
    fetchAssetAccounts,
    getActivePaymentMethods,
    getPaymentMethodsByType,
    getDefaultPaymentMethods,
    savePaymentMethod,
    deletePaymentMethod,
  };
}
