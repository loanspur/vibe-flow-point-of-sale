import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  barcode: string | null;
  stock_quantity: number | null;
  min_stock_level: number | null;
  retail_price_num: number | null;
  wholesale_price_num: number | null;
  cost_price: number | null;
  status: string | null;
  created_at: string | null;
  tenant_id: string | null;
  location_id?: string | null;
  location_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  unit_id?: string | null;
  unit_name?: string | null;
  image_url?: string | null;
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
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    queryFn: async () => {
      // 1) pull products with related data
      const { data, error, status } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id(name),
          brands:brand_id(name),
          units:unit_id(name)
        `)
        .eq('tenant_id', tenantId as string);

      if (error) {
        console.warn('[products:list] select failed', { status, error });
        throw error;
      }

      const items = data ?? [];

      // 2) Always fetch location names for better UX
      let locMap: Record<string, string> = {};
      const locIds = Array.from(
        new Set(items.map((p: any) => p.location_id).filter(Boolean))
      ) as string[];

      if (locIds.length > 0) {
        try {
          const { data: locationData, error: locationError } = await supabase
            .from('store_locations')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .in('id', locIds);

          if (locationError) {
            console.warn('[products:list] location fetch failed:', locationError);
          } else if (locationData) {
            locMap = Object.fromEntries(
              locationData.map((x: any) => [x.id, x.name])
            );
            console.log('[products:list] loaded locations:', locMap);
          }
        } catch (locationErr) {
          console.warn('[products:list] location fetch error:', locationErr);
        }
      }

      // 3) normalize
      const mapped = items.map((p: any) => ({
        id: p.id,
        name: p.name ?? p.product_name ?? p.title ?? '',
        sku: p.sku ?? null,
        description: p.description ?? null,
        barcode: p.barcode ?? null,
        stock_quantity: toNumber(p.stock_quantity ?? p.qty),
        min_stock_level: toNumber(p.min_stock_level),
        retail_price_num: toNumber(p.retail_price ?? p.price),
        wholesale_price_num: toNumber(p.wholesale_price ?? p.wholesale),
        cost_price: toNumber(p.cost_price),
        status: p.status ?? null,
        created_at: p.created_at ?? p.inserted_at ?? p.updated_at ?? null,
        tenant_id: p.tenant_id ?? null,
        location_id: p.location_id ?? null,
        // Guaranteed location name with fallback
        location_name: p.location_name ?? locMap[p.location_id] ?? (p.location_id ? 'Location Not Found' : 'No Location'),
        // Related data
        category_id: p.category_id ?? null,
        category_name: p.categories?.name ?? null,
        brand_id: p.brand_id ?? null,
        brand_name: p.brands?.name ?? null,
        unit_id: p.unit_id ?? null,
        unit_name: p.units?.name ?? null,
        image_url: p.image_url ?? null,
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
