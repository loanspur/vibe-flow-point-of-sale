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

  const createMutation = useMutation({
    mutationFn: async (input: Partial<T>) => {
      // Enforce tenant_id on every create to satisfy RLS
      const payload = {
        ...input,
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
      // Preserve tenant_id if present, otherwise use the hook's tenantId
      const parsed = schema.partial().parse({ 
        ...input, 
        tenant_id: (input as any)?.tenant_id ?? tenantId 
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
