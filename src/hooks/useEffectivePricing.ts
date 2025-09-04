import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dlog } from '@/lib/logger';

interface EffectivePricing {
  effective_amount: number;
  is_custom: boolean;
  custom_pricing_id?: string;
  discount_percentage?: number;
  original_amount: number;
  setup_fee?: number;
}

export const useEffectivePricing = (tenantId?: string, billingPlanId?: string) => {
  const [effectivePricing, setEffectivePricing] = useState<EffectivePricing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId && billingPlanId) {
      fetchEffectivePricing(tenantId, billingPlanId);
    }
  }, [tenantId, billingPlanId]);

  const fetchEffectivePricing = async (tenantId: string, billingPlanId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      dlog('Fetching effective pricing for:', { tenantId, billingPlanId });
      
      const { data, error } = await supabase
        .rpc('get_tenant_effective_pricing', {
          tenant_id_param: tenantId,
          billing_plan_id_param: billingPlanId
        });

      if (error) throw error;
      dlog('RPC response:', data);

      if (data && data.length > 0) {
        // Always fetch setup fee from custom pricing if available
        dlog('Fetching setup fee from custom pricing...');
        const today = new Date().toISOString().split('T')[0];
        const { data: customPricing, error: customError } = await supabase
          .from('tenant_custom_pricing')
          .select('setup_fee,effective_date,expires_at')
          .eq('tenant_id', tenantId)
          .eq('billing_plan_id', billingPlanId)
          .eq('is_active', true)
          .lte('effective_date', today)
          .or(`expires_at.is.null,expires_at.gte.${today}`)
          .order('effective_date', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        
        dlog('Custom pricing setup fee response:', { customPricing, customError });
        
        const setupFee = customPricing?.setup_fee || 0;
        dlog('Final setup fee:', setupFee);
        
        const finalPricing = {
          ...data[0],
          setup_fee: setupFee
        };
        
        dlog('Final effective pricing:', finalPricing);
        setEffectivePricing(finalPricing);
      } else {
        setEffectivePricing(null);
      }
    } catch (err: any) {
      console.error('Error fetching effective pricing:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCustomPricing = async (
    tenantId: string,
    billingPlanId: string,
    customAmount: number,
    reason?: string,
    notes?: string,
    effectiveDate?: Date,
    expiresAt?: Date
  ) => {
    try {
      // Get plan's original price
      const { data: planData, error: planError } = await supabase
        .from('billing_plans')
        .select('price')
        .eq('id', billingPlanId)
        .single();

      if (planError) throw planError;

      const originalAmount = planData.price;
      const discountPercentage = ((originalAmount - customAmount) / originalAmount) * 100;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const customPricingData = {
        tenant_id: tenantId,
        billing_plan_id: billingPlanId,
        custom_amount: customAmount,
        original_amount: originalAmount,
        discount_percentage: discountPercentage,
        reason: reason || '',
        notes: notes || '',
        effective_date: effectiveDate ? effectiveDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expires_at: expiresAt ? expiresAt.toISOString().split('T')[0] : null,
        is_active: true,
        created_by: userData.user.id,
        approved_by: userData.user.id,
        approved_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tenant_custom_pricing')
        .upsert(customPricingData, {
          onConflict: 'tenant_id,billing_plan_id'
        });

      if (error) throw error;

      // Refresh the effective pricing
      await fetchEffectivePricing(tenantId, billingPlanId);
      
      return true;
    } catch (err: any) {
      console.error('Error updating custom pricing:', err);
      setError(err.message);
      return false;
    }
  };

  const removeCustomPricing = async (tenantId: string, billingPlanId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_custom_pricing')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('billing_plan_id', billingPlanId);

      if (error) throw error;

      // Refresh the effective pricing
      await fetchEffectivePricing(tenantId, billingPlanId);
      
      return true;
    } catch (err: any) {
      console.error('Error removing custom pricing:', err);
      setError(err.message);
      return false;
    }
  };

  return {
    effectivePricing,
    loading,
    error,
    updateCustomPricing,
    removeCustomPricing,
    refetch: () => tenantId && billingPlanId && fetchEffectivePricing(tenantId, billingPlanId)
  };
};