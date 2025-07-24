import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYSTACK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { reference } = await req.json();
    if (!reference) {
      throw new Error("Payment reference is required");
    }

    logStep("Verifying payment", { reference });

    // Verify payment with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.status) {
      throw new Error(`Payment verification failed: ${verifyData.message}`);
    }

    const transaction = verifyData.data;
    logStep("Payment verified", { 
      status: transaction.status,
      amount: transaction.amount,
      customer: transaction.customer
    });

    if (transaction.status === 'success') {
      const metadata = transaction.metadata;
      logStep("Processing successful payment", { metadata });
      
      if (!metadata || !metadata.tenant_id || !metadata.plan_id) {
        throw new Error("Missing required metadata in transaction");
      }

      // Update payment record status
      const { error: paymentUpdateError } = await supabaseClient
        .from('payment_history')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...metadata,
            paystack_response: {
              reference: transaction.reference,
              status: transaction.status,
              amount: transaction.amount,
              currency: transaction.currency,
              paid_at: transaction.paid_at
            }
          }
        })
        .eq('payment_reference', reference);

      if (paymentUpdateError) {
        logStep("Error updating payment history", { error: paymentUpdateError });
      }

      // Update tenant subscription details
      const { error: subscriptionError } = await supabaseClient
        .from('tenant_subscription_details')
        .update({
          status: 'active',
          paystack_subscription_id: transaction.subscription?.subscription_code || null,
          current_period_start: new Date().toISOString().split('T')[0],
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          metadata: {
            ...metadata,
            last_payment_reference: reference,
            last_payment_amount: transaction.amount / 100, // Convert from kobo
            payment_verified_at: new Date().toISOString()
          }
        })
        .eq('tenant_id', metadata.tenant_id)
        .eq('billing_plan_id', metadata.plan_id);

      if (subscriptionError) {
        logStep("Error updating subscription details", { error: subscriptionError });
        throw new Error("Failed to update subscription status");
      }

      // Update billing plan statistics (optional, don't fail on error)
      try {
        const { error: planUpdateError } = await supabaseClient.rpc(
          'increment_plan_stats',
          { 
            plan_id: metadata.plan_id,
            revenue_amount: transaction.amount / 100 // Convert from kobo
          }
        );
        
        if (planUpdateError) {
          logStep("Warning: Could not update plan statistics", { error: planUpdateError });
        }
      } catch (planError) {
        logStep("Plan statistics update failed (non-critical)", { error: planError });
      }

      logStep("Payment verification completed successfully", { 
        tenantId: metadata.tenant_id,
        planId: metadata.plan_id,
        amount: transaction.amount / 100
      });

      return new Response(JSON.stringify({ 
        success: true,
        status: 'verified',
        message: 'Payment verified and subscription activated',
        subscription: {
          tenant_id: metadata.tenant_id,
          plan_id: metadata.plan_id,
          plan_name: metadata.plan_name,
          status: 'active',
          amount: transaction.amount / 100,
          currency: transaction.currency,
          reference: reference,
          verified_at: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error(`Payment failed with status: ${transaction.status}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-paystack-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});