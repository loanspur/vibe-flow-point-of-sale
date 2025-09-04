import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { productVariantSchema } from '@/lib/validation-schemas';

export interface ProductVariant {
  id?: string;
  name: string;
  value: string;
  sku: string;
  price_adjustment: number;
  stock_quantity: number;
  min_stock_level: number;
  default_profit_margin: number;
  sale_price: number;
  wholesale_price: number;
  retail_price: number;
  cost_price: number;
  image_url?: string;
  is_active: boolean;
  product_id: string;
}

export function useVariantCRUD(productId: string) {
  const queryClient = useQueryClient();
  
  // Query key for variants
  const variantsKey = ['product_variants', productId];
  
  // Fetch variants for a specific product
  const variants = useQuery({
    queryKey: variantsKey,
    queryFn: async (): Promise<ProductVariant[]> => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  // Create new variant
  const createVariant = useMutation({
    mutationFn: async (variantData: Omit<ProductVariant, 'id'>): Promise<ProductVariant> => {
      const parsed = productVariantSchema.omit({ id: true }).parse(variantData);
      const { data, error } = await supabase
        .from('product_variants')
        .insert(parsed)
        .select('*')
        .single();
      
      if (error) throw error;
      return productVariantSchema.parse(data);
    },
    onSuccess: (newVariant) => {
      // Optimistically update the cache
      queryClient.setQueryData(variantsKey, (oldData: ProductVariant[] | undefined) => {
        if (!oldData) return [newVariant];
        return [...oldData, newVariant];
      });
    },
  });

  // Update existing variant
  const updateVariant = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductVariant> }): Promise<ProductVariant> => {
      const parsed = productVariantSchema.partial().parse(data);
      const { data: updatedData, error } = await supabase
        .from('product_variants')
        .update(parsed)
        .eq('id', id)
        .select('*');
      
      if (error) throw error;
      
      // Handle case where no rows are returned (variant might not exist)
      if (!updatedData || updatedData.length === 0) {
        throw new Error(`No variant found with ID: ${id}. Cannot update non-existent variant.`);
      }
      
      return productVariantSchema.parse(updatedData[0]);
    },
    onSuccess: (updatedVariant) => {
      // Optimistically update the cache
      queryClient.setQueryData(variantsKey, (oldData: ProductVariant[] | undefined) => {
        if (!oldData) return [updatedVariant];
        return oldData.map(variant => 
          variant.id === updatedVariant.id ? updatedVariant : variant
        );
      });
    },
  });

  // Delete variant
  const deleteVariant = useMutation({
    mutationFn: async (id: string): Promise<{ id: string }> => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: (deletedVariant) => {
      // Optimistically update the cache
      queryClient.setQueryData(variantsKey, (oldData: ProductVariant[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(variant => variant.id !== deletedVariant.id);
      });
    },
  });

  // Bulk update variants
  const bulkUpdateVariants = useMutation({
    mutationFn: async (variants: ProductVariant[]): Promise<ProductVariant[]> => {
      const results: ProductVariant[] = [];
      
      for (const variant of variants) {
        if (variant.id) {
          // Update existing variant
          const { data, error } = await supabase
            .from('product_variants')
            .update({
              name: variant.name,
              value: variant.value,
              sku: variant.sku,
              price_adjustment: variant.price_adjustment,
              stock_quantity: variant.stock_quantity,
              min_stock_level: variant.min_stock_level,
              default_profit_margin: variant.default_profit_margin,
              sale_price: variant.sale_price,
              wholesale_price: variant.wholesale_price,
              retail_price: variant.retail_price,
              cost_price: variant.cost_price,
              image_url: variant.image_url,
              is_active: variant.is_active,
            })
            .eq('id', variant.id)
            .select('*');
          
          if (error) throw error;
          
          // Handle case where no rows are returned (variant might not exist)
          if (!data || data.length === 0) {
            console.warn(`⚠️ No variant found with ID: ${variant.id}. Skipping update.`);
            // Return the original variant data to maintain consistency
            results.push(variant);
            continue;
          }
          
          results.push(productVariantSchema.parse(data[0]));
        } else {
          // Create new variant
          const { data, error } = await supabase
            .from('product_variants')
            .insert({
              name: variant.name,
              value: variant.value,
              sku: variant.sku,
              price_adjustment: variant.price_adjustment,
              stock_quantity: variant.stock_quantity,
              min_stock_level: variant.min_stock_level,
              default_profit_margin: variant.default_profit_margin,
              sale_price: variant.sale_price,
              wholesale_price: variant.wholesale_price,
              retail_price: variant.retail_price,
              cost_price: variant.cost_price,
              image_url: variant.image_url,
              is_active: variant.is_active,
              product_id: productId,
            })
            .select('*')
            .single();
          
          if (error) throw error;
          results.push(productVariantSchema.parse(data));
        }
      }
      
      return results;
    },
    onSuccess: (updatedVariants) => {
      // Update the entire variants cache
      queryClient.setQueryData(variantsKey, updatedVariants);
    },
  });

  return {
    variants,
    createVariant: createVariant.mutateAsync,
    updateVariant: updateVariant.mutateAsync,
    deleteVariant: deleteVariant.mutateAsync,
    bulkUpdateVariants: bulkUpdateVariants.mutateAsync,
    isLoading: variants.isLoading || createVariant.isPending || updateVariant.isPending || deleteVariant.isPending || bulkUpdateVariants.isPending,
    refetch: variants.refetch,
  };
}
