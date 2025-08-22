import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { tenantId, paymentReference } = await req.json();
    logStep("Request data", { tenantId, paymentReference });

    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

    let result = { success: false, message: "" };

    if (paymentReference) {
      // Sync based on specific payment reference
      logStep("Syncing based on payment reference", { paymentReference });
      
      // Get payment details
      const { data: payment, error: paymentError } = await supabaseClient
        .from('payment_history')
        .select('*')
        .eq('payment_reference', paymentReference)
        .eq('tenant_id', tenantId)
        .single();

      if (paymentError || !payment) {
        throw new Error(`Payment not found: ${paymentError?.message}`);
      }

      logStep("Payment found", payment);

      // Update payment status to completed if not already
      if (payment.payment_status !== 'completed') {
        const { error: updateError } = await supabaseClient
          .from('payment_history')
          .update({
            payment_status: 'completed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          throw new Error(`Failed to update payment: ${updateError.message}`);
        }
        
        logStep("Payment status updated to completed");
      }

      result = { success: true, message: "Payment synchronized successfully" };
    } else {
      // Manual sync for tenant
      logStep("Manual sync for tenant", { tenantId });
      
      const { data: syncResult, error: syncError } = await supabaseClient
        .rpc('manual_sync_subscription_status', {
          tenant_id_param: tenantId
        });

      if (syncError) {
        throw new Error(`Sync failed: ${syncError.message}`);
      }

      logStep("Manual sync result", syncResult);
      result = { 
        success: syncResult || false, 
        message: syncResult ? "Subscription synchronized successfully" : "No synchronization needed"
      };
    }

    logStep("Sync completed", result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-subscription-status", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});