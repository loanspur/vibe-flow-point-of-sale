import { supabase } from '@/integrations/supabase/client';

export function slugifyName(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function generateUniqueSku(base: string, tenantId?: string) {
  const root = slugifyName(base).slice(0, 16) || 'SKU';
  let candidate = root;
  let i = 1;
  // loop until unique within tenant
  // NOTE: small loop, guarded by limit 1
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('sku', candidate)
      .limit(1);
    if (!error && (!data || (Array.isArray(data) && data.length === 0))) return candidate;
    candidate = `${root}-${++i}`;
  }
}

export function makeVariantSku(parentSku: string, optionCode: string) {
  const code = slugifyName(optionCode).replace(/-/g, '').slice(0, 6) || 'VAR';
  return `${parentSku}-${code}`;
}
