import { z } from "zod";
import { useUnifiedCRUD } from "@/hooks/useUnifiedCRUD";
import { brandSchema } from "@/lib/validation-schemas";

export type Brand = z.infer<typeof brandSchema>;

export function useBrandCRUD(tenantId: string | null) {
  return useUnifiedCRUD<Brand>({
    entityName: "Brand",
    table: "brands",
    tenantId,
    schema: brandSchema,
    baseQueryKey: ["brands", tenantId],
  });
}
