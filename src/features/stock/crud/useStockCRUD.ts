import { z } from "zod";
import { useUnifiedCRUD } from "@/hooks/useUnifiedCRUD";
import { stockAdjustmentSchema, stockTransferSchema } from "@/lib/validation-schemas";

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;
export type StockTransfer = z.infer<typeof stockTransferSchema>;

export function useStockCRUD(tenantId: string | null) {
  return useUnifiedCRUD<StockAdjustment>({
    entityName: "StockAdjustment",
    table: "stock_adjustments",
    tenantId,
    schema: stockAdjustmentSchema,
    baseQueryKey: ["stock_adjustments", tenantId],
  });
}

export function useStockTransferCRUD(tenantId: string | null) {
  return useUnifiedCRUD<StockTransfer>({
    entityName: "StockTransfer",
    table: "stock_transfers",
    tenantId,
    schema: stockTransferSchema,
    baseQueryKey: ["stock_transfers", tenantId],
  });
}
