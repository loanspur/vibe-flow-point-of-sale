import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tries the view `low_stock_products`.
 * If the view isn't present yet (404/42P01), gracefully falls back
 * to filtering from `products` on the server.
 */
export function useLowStockProducts(tenantId?: string | null) {
  return useQuery({
    queryKey: ["low-stock-products", tenantId],
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const { data, error, status } = await supabase
          .from("low_stock_products")
          .select("id, tenant_id, stock_quantity, min_stock_level")
          .eq("tenant_id", tenantId!);

        // View missing (404 from PostgREST) or relation missing (42P01 from PG) or 400 Bad Request
        if (error && (status === 404 || status === 400 || (error as any)?.code === "42P01")) {
          console.warn("low_stock_products view not available, falling back to products table:", error);
          
          // Fallback: fetch products and filter in-memory (still one roundtrip)
          const { data: prods, error: e2 } = await supabase
            .from("products")
            .select("id, tenant_id, stock_quantity, min_stock_level")
            .eq("tenant_id", tenantId!)
            .eq("is_active", true);

          if (e2) {
            console.error("Fallback query also failed:", e2);
            throw e2;
          }
          
          return (prods ?? []).filter(
            (p) =>
              typeof p.stock_quantity === "number" &&
              typeof p.min_stock_level === "number" &&
              p.stock_quantity <= p.min_stock_level
          );
        }

        if (error) throw error;
        return data ?? [];
      } catch (error) {
        console.error("Error in useLowStockProducts:", error);
        throw error;
      }
    },
  });
}
