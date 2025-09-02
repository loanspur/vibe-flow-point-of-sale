import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number | null;
  min_stock_level: number | null;
  retail_price_num: number | null;
  wholesale_price_num: number | null;
  status: string | null;
  created_at: string | null;
  tenant_id: string | null;
  location_id?: string | null;
  location_name?: string | null;
};

const toNumber = (v: any): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined || v === '') return null;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

export function useTenantProductsList() {
  const { tenantId } = useAuth();

  return useQuery<ProductRow[]>({
    queryKey: ['products:list', tenantId],
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: async () => {
      // 1) pull products
      const { data, error, status } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId as string);

      if (error) {
        console.warn('[products:list] select failed', { status, error });
        throw error;
      }

      const items = data ?? [];

      // 2) (optional) side-load location names if you only have location_id
      const locationTable = import.meta.env.VITE_LOCATION_TABLE?.trim();
      let locMap: Record<string, string> = {};

      const locIds = Array.from(
        new Set(items.map((p: any) => p.location_id).filter(Boolean))
      ) as string[];

      if (locationTable && locIds.length) {
        const r = await supabase.from(locationTable).select('id,name').in('id', locIds);
        if (!r.error && r.data?.length) {
          locMap = Object.fromEntries(r.data.map((x: any) => [x.id, x.name]));
        }
        // Don't warn or throw if it doesn't exist—just skip names.
      }

      // 3) normalize
      const mapped = items.map((p: any) => ({
        id: p.id,
        name: p.name ?? p.product_name ?? p.title ?? '',
        sku: p.sku ?? null,
        stock_quantity: toNumber(p.stock_quantity ?? p.qty),
        min_stock_level: toNumber(p.min_stock_level),
        retail_price_num: toNumber(p.retail_price ?? p.price),
        wholesale_price_num: toNumber(p.wholesale_price ?? p.wholesale),
        status: p.status ?? null,
        created_at: p.created_at ?? p.inserted_at ?? p.updated_at ?? null,
        tenant_id: p.tenant_id ?? null,
        location_id: p.location_id ?? null,
        location_name: p.location_name ?? (p.location_id ? locMap[p.location_id] : null) ?? null,
      })) as ProductRow[];

      // newest first
      mapped.sort((a, b) => {
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        if (bt !== at) return bt - at;
        return (b.id || '').localeCompare(a.id || '');
      });

      return mapped;
    },
  });
}
