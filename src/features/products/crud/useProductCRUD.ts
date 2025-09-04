import { z } from "zod";
import { useUnifiedCRUD } from "@/hooks/useUnifiedCRUD";
import { productSchema } from "@/lib/validation-schemas";

export type Product = z.infer<typeof productSchema>;

export function useProductCRUD(tenantId: string | null) {
  return useUnifiedCRUD<Product>({
    entityName: "Product",
    table: "products",
    tenantId,
    schema: productSchema,
    baseQueryKey: ["products", tenantId],
  });
}
