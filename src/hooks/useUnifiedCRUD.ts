import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  validateProduct, 
  validateBrand, 
  validateUnit,
  ProductFormData,
  BrandFormData,
  UnitFormData
} from '@/lib/validation-schemas';

interface UseUnifiedCRUDOptions {
  entityName: string;
  queryKey: string[];
  tableName: string;
  validationFn: (data: any) => { success: boolean; data?: any; errors?: any[] };
  transformData?: (data: any) => any;
}

export function useUnifiedCRUD<T = any>(options: UseUnifiedCRUDOptions) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: T) => {
      // Validate data
      const validation = options.validationFn(data);
      if (!validation.success) {
        throw new Error(validation.errors?.[0]?.message || 'Validation failed');
      }

      // Transform data if needed
      const transformedData = options.transformData ? options.transformData(validation.data) : validation.data;

      // Add tenant_id
      const insertData = {
        ...transformedData,
        tenant_id: tenantId,
      };

      const { error } = await supabase
        .from(options.tableName)
        .insert(insertData);

      if (error) throw error;
      return validation.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: options.queryKey });
      toast({
        title: `${options.entityName} Created`,
        description: `${options.entityName} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: `Failed to create ${options.entityName}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: T }) => {
      // Validate data
      const validation = options.validationFn(data);
      if (!validation.success) {
        throw new Error(validation.errors?.[0]?.message || 'Validation failed');
      }

      // Transform data if needed
      const transformedData = options.transformData ? options.transformData(validation.data) : validation.data;

      const { error } = await supabase
        .from(options.tableName)
        .update(transformedData)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return validation.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: options.queryKey });
      toast({
        title: `${options.entityName} Updated`,
        description: `${options.entityName} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: `Failed to update ${options.entityName}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(options.tableName)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: options.queryKey });
      toast({
        title: `${options.entityName} Deleted`,
        description: `${options.entityName} has been deleted successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: `Failed to delete ${options.entityName}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}

// Specific hooks for each entity type
export function useProductCRUD() {
  return useUnifiedCRUD<ProductFormData>({
    entityName: 'Product',
    queryKey: ['products'],
    tableName: 'products',
    validationFn: validateProduct,
    transformData: (data) => ({
      ...data,
      // Ensure numeric fields are properly converted
      price: Number(data.price) || 0,
      wholesale_price: Number(data.wholesale_price) || 0,
      retail_price: Number(data.retail_price) || 0,
      cost_price: Number(data.cost_price) || 0,
      purchase_price: Number(data.purchase_price) || 0,
      default_profit_margin: Number(data.default_profit_margin) || 0,
      stock_quantity: Number(data.stock_quantity) || 0,
      min_stock_level: Number(data.min_stock_level) || 0,
    }),
  });
}

export function useBrandCRUD() {
  return useUnifiedCRUD<BrandFormData>({
    entityName: 'Brand',
    queryKey: ['brands'],
    tableName: 'brands',
    validationFn: validateBrand,
  });
}

export function useUnitCRUD() {
  return useUnifiedCRUD<UnitFormData>({
    entityName: 'Unit',
    queryKey: ['product_units'],
    tableName: 'product_units',
    validationFn: validateUnit,
    transformData: (data) => ({
      ...data,
      conversion_factor: Number(data.conversion_factor) || 1,
      base_unit_id: data.is_base_unit ? null : data.base_unit_id,
    }),
  });
}

// Generic hook for other entities
export function useGenericCRUD<T = any>(
  entityName: string,
  queryKey: string[],
  tableName: string,
  validationFn: (data: any) => { success: boolean; data?: any; errors?: any[] },
  transformData?: (data: any) => any
) {
  return useUnifiedCRUD<T>({
    entityName,
    queryKey,
    tableName,
    validationFn,
    transformData,
  });
}
