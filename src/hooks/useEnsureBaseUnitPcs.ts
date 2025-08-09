import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Ensures tenant-wide base unit "pcs" exists in product_units. No-ops if present.
export function useEnsureBaseUnitPcs() {
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const ensure = async () => {
      try {
        const { data, error } = await supabase
          .from('product_units')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('code', 'PCS')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // Ignore not found; otherwise log and bail
          console.warn('useEnsureBaseUnitPcs check error', error);
          return;
        }

        if (!data && !cancelled) {
          const { error: insertError } = await supabase.from('product_units').insert({
            tenant_id: tenantId,
            name: 'Pieces',
            abbreviation: 'pcs',
            code: 'PCS',
            base_unit_id: null,
            conversion_factor: 1,
            is_active: true,
          });
          if (insertError) {
            console.warn('useEnsureBaseUnitPcs insert error', insertError);
          }
        }
      } catch (e) {
        console.warn('useEnsureBaseUnitPcs unexpected', e);
      }
    };

    ensure();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);
}
