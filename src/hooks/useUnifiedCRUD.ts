import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z, ZodTypeAny } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Id = string | number;

export interface UseUnifiedCRUDOpts<T> {
  entityName: string;           // e.g. "Product"
  table: string;                // e.g. "products"
  tenantId: string | null;      // scoping
  schema: ZodTypeAny;           // zod schema for T
  baseQueryKey: unknown[];      // stable base key, e.g. ["products", tenantId]
}

export interface UnifiedCRUDResult<T> {
  list: ReturnType<typeof useQuery<T[]>>;
  createItem: (input: Partial<T>) => Promise<T>;
  updateItem: (id: Id, input: Partial<T>) => Promise<T>;
  deleteItem: (id: Id) => Promise<{ id: Id }>;
  invalidate: () => Promise<void>;
  isLoading: boolean;
}

export function useUnifiedCRUD<T = unknown>(opts: UseUnifiedCRUDOpts<T>): UnifiedCRUDResult<T> {
  const { entityName, table, tenantId, schema, baseQueryKey } = opts;
  const { tenantId: authTenant, user } = useAuth();
  const effectiveTenant = tenantId ?? authTenant ?? null;
  const qc = useQueryClient();

  const keyList = useMemo(() => [...baseQueryKey, "list"], [baseQueryKey]);

  const list = useQuery<T[]>({
    queryKey: keyList,
    enabled: !!effectiveTenant,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (prev) => prev as T[] | undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("tenant_id", effectiveTenant!);
      if (error) throw error;
      return (data ?? []).map((row) => schema.parse(row)) as T[];
    },
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: baseQueryKey, exact: false, refetchType: "active" });
  };

  // Helper function to filter out non-database fields
  const filterDatabaseFields = (input: Partial<T>): Record<string, unknown> => {
    // Get the table schema to know which fields are valid
    const tableSchema = supabase.from(table).select('*').limit(0);
    
    // Define known database fields for each table to prevent hasVariants errors
    const knownFields: Record<string, string[]> = {
      'products': [
        'id', 'name', 'sku', 'description', 'wholesale_price', 'retail_price', 'cost_price',
        'purchase_price', 'default_profit_margin', 'barcode', 'category_id', 'subcategory_id',
        'brand_id', 'unit_id', 'stock_quantity', 'min_stock_level', 'has_expiry_date',
        'is_active', 'location_id', 'image_url', 'tenant_id', 'created_at', 'updated_at',
        'created_by', 'is_combo_product', 'allow_negative_stock', 'revenue_account_id', 'expiry_date',
        // Additional fields that were missing
        'unit_precision', 'track_expiry', 'expiry_alert_days', 'reorder_level', 'reorder_quantity',
        'supplier_id', 'tax_rate', 'discount_rate', 'weight', 'dimensions', 'notes',
        'tags', 'custom_fields', 'is_featured', 'sort_order', 'meta_title', 'meta_description'
      ],
      'product_variants': [
        'id', 'name', 'value', 'sku', 'price_adjustment', 'stock_quantity', 'cost_price',
        'wholesale_price', 'retail_price', 'image_url', 'is_active', 'product_id', 'tenant_id',
        'created_at', 'updated_at'
      ]
    };
    
    const validFields = knownFields[table] || [];
    
    // Filter input to only include valid database fields
    const filteredInput = Object.fromEntries(
      Object.entries(input).filter(([key, value]) => {
        // Always include tenant_id for RLS
        if (key === 'tenant_id') return true;
        
        // Only include fields that exist in the known database schema
        return validFields.includes(key);
      })
    );
    
    // Log any filtered fields for debugging
    const filteredOut = Object.keys(input).filter(key => !validFields.includes(key) && key !== 'tenant_id');
    if (filteredOut.length > 0) {
      console.warn(`[useUnifiedCRUD] Filtered out non-database fields for ${table}:`, filteredOut);
    }
    
    return filteredInput;
  };

  const createMutation = useMutation({
    mutationFn: async (input: Partial<T>) => {
      // Enforce tenant_id on every create to satisfy RLS
      const payload = {
        ...filterDatabaseFields(input), // ✅ Filter fields before spreading
        tenant_id: effectiveTenant,
        // Common audit column if present
        created_by: user?.id ?? null,
      };
      
      const parsed = schema.partial().parse(payload);
      const { data, error } = await supabase
        .from(table)
        .insert(parsed as Record<string, unknown>)
        .select("*")
        .single();
      if (error) throw error;
      return schema.parse(data) as T;
    },
    onSuccess: (newItem) => {
      // Optimistically update the cache instead of invalidating
      qc.setQueryData(keyList, (oldData: T[] | undefined) => {
        if (!oldData) return [newItem];
        return [newItem, ...oldData];
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: Id; input: Partial<T> }) => {
      // Filter input to only include valid database fields
      const filteredInput = filterDatabaseFields(input);
      
      // Preserve tenant_id if present, otherwise use the hook's tenantId
      const parsed = schema.partial().parse({ 
        ...filteredInput, // ✅ Now spreading filtered fields only
        tenant_id: (filteredInput as any)?.tenant_id ?? tenantId 
      });
      const { data, error } = await supabase
        .from(table)
        .update(parsed as Record<string, unknown>)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return schema.parse(data) as T;
    },
    onSuccess: (updatedItem) => {
      // Optimistically update the cache instead of invalidating
      qc.setQueryData(keyList, (oldData: T[] | undefined) => {
        if (!oldData) return [updatedItem];
        return oldData.map(item => 
          (item as any).id === (updatedItem as any).id ? updatedItem : item
        );
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: Id) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: (deletedItem) => {
      // Optimistically update the cache instead of invalidating
      qc.setQueryData(keyList, (oldData: T[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(item => (item as any).id !== deletedItem.id);
      });
    },
  });

  return {
    list,
    createItem: (input: Partial<T>) => createMutation.mutateAsync(input),
    updateItem: (id: Id, input: Partial<T>) => updateMutation.mutateAsync({ id, input }),
    deleteItem: (id: Id) => deleteMutation.mutateAsync(id),
    invalidate,
    isLoading: list.isLoading || createMutation.isPending || updateMutation.isPending,
  };
}
