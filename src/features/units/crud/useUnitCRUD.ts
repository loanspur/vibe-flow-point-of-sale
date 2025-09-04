import { z } from "zod";
import { useUnifiedCRUD } from "@/hooks/useUnifiedCRUD";
import { unitSchema } from "@/lib/validation-schemas";

export type Unit = z.infer<typeof unitSchema>;

export function useUnitCRUD(tenantId: string | null) {
  return useUnifiedCRUD<Unit>({
    entityName: "Unit",
    table: "product_units",
    tenantId,
    schema: unitSchema,
    baseQueryKey: ["product_units", tenantId],
  });
}
