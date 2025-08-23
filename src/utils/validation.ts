import { supabase } from "@/integrations/supabase/client";

export const validatePaymentReference = async (
  reference: string, 
  tenantId: string, 
  existingPayments: any[]
) => {
  try {
    // Centralized validation logic
    const isDuplicate = existingPayments.some(p => p.reference === reference);
    if (isDuplicate) throw new Error("Duplicate reference");
    
    // Database check
    const { data, error } = await supabase
      .from('ar_ap_payments')
      .select('reference_number')
      .eq('tenant_id', tenantId)
      .eq('reference_number', reference)
      .limit(1);
      
    if (error) throw error;
    if (data?.length > 0) throw new Error("Reference already exists");
  } catch (error) {
    throw error;
  }
};