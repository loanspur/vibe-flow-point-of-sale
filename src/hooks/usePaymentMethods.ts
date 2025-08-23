import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  name: string;
  type: 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'crypto' | 'other' | 'credit';
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

export const usePaymentMethods = (options?: {
  includeInactive?: boolean;
  excludeCredit?: boolean;
  cacheKey?: string;
}) => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    if (!tenantId) {
      setPaymentMethods([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });

      // Apply filters
      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Enhance with account information
      const enhancedMethods = await Promise.all(
        (data || []).map(async (method: any) => {
          let account_name = '';
          let account_code = '';
          
          if (method.account_id) {
            const { data: accountData } = await supabase
              .from('accounts')
              .select('name, code')
              .eq('id', method.account_id)
              .maybeSingle();
              
            if (accountData) {
              account_name = accountData.name;
              account_code = accountData.code;
            }
          }
          
          return {
            ...method,
            account_name,
            account_code,
          };
        })
      );

      // Apply additional filters
      let filteredMethods = enhancedMethods;
      if (options?.excludeCredit) {
        filteredMethods = enhancedMethods.filter(method => method.type !== 'credit');
      }

      setPaymentMethods(filteredMethods);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch payment methods');
      setError(error);
      console.error('Error fetching payment methods:', error);
      
      // Use fallback methods
      const fallbackMethods: PaymentMethod[] = [
        {
          id: 'default-cash',
          tenant_id: tenantId,
          name: 'Cash',
          type: 'cash',
          is_active: true,
          requires_reference: false,
          display_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'default-card',
          tenant_id: tenantId,
          name: 'Card',
          type: 'card',
          is_active: true,
          requires_reference: true,
          display_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setPaymentMethods(fallbackMethods);
      toast({
        title: "Warning",
        description: "Could not load payment methods. Using defaults.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, options?.includeInactive, options?.excludeCredit, toast]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`payment_methods_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_methods',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Refetch on any change
          fetchPaymentMethods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchPaymentMethods]);

  // Initial fetch
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return {
    paymentMethods,
    loading,
    error,
    refetch: fetchPaymentMethods
  };
};
