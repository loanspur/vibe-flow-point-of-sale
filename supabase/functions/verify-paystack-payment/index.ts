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
  logStep("Request received", { method: req.method, url: req.url });
  
  if (req.method === "OPTIONS") {
    logStep("CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({}));
    const { reference } = body;
    
    if (!reference) {
      logStep("ERROR: Missing payment reference", { body });
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
    logStep("Paystack response received", { 
      status: verifyData.status, 
      statusCode: verifyResponse.status,
      hasData: !!verifyData.data 
    });

    if (!verifyResponse.ok) {
      throw new Error(`Paystack API error: ${verifyResponse.status} - ${verifyData.message || 'Unknown error'}`);
    }

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
      
      // Extract tenant_id and plan_id from metadata or payment reference
      let tenant_id = metadata?.tenant_id;
      let plan_id = metadata?.plan_id;
      
      // If not in metadata, try to extract from payment reference format: sub_{tenant_id}_{timestamp}
      if (!tenant_id && reference.startsWith('sub_')) {
        const referenceParts = reference.split('_');
        if (referenceParts.length >= 2) {
          tenant_id = referenceParts[1];
        }
      }
      
      if (!plan_id) {
        logStep("Looking up payment record", { reference });
        const { data: paymentRecord, error: lookupError } = await supabaseClient
          .from('payment_history')
          .select('billing_plan_id, tenant_id')
          .eq('payment_reference', reference)
          .single();
        
        if (lookupError) {
          logStep("Error looking up payment record", { error: lookupError });
        }
        
        if (paymentRecord) {
          plan_id = paymentRecord.billing_plan_id;
          tenant_id = tenant_id || paymentRecord.tenant_id;
          logStep("Found payment record", { plan_id, tenant_id });
        }
      }
      
      if (!tenant_id || !plan_id) {
        logStep("ERROR: Missing required data", { 
          tenant_id, 
          plan_id, 
          reference, 
          extractedFromRef: reference.startsWith('sub_') ? reference.split('_')[1] : null 
        });
        throw new Error(`Missing required data: tenant_id=${tenant_id}, plan_id=${plan_id}`);
      }

      logStep("Payment data validation successful", { tenant_id, plan_id });

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
        .eq('tenant_id', tenant_id)
        .eq('billing_plan_id', plan_id);

      if (subscriptionError) {
        logStep("Error updating subscription details", { error: subscriptionError });
        throw new Error("Failed to update subscription status");
      }

      // Update billing plan statistics (optional, don't fail on error)
      try {
        const { data: currentPlan } = await supabaseClient
          .from('billing_plans')
          .select('customers, mrr')
          .eq('id', plan_id)
          .single();
        
        if (currentPlan) {
          const { error: planUpdateError } = await supabaseClient
            .from('billing_plans')
            .update({
              customers: (currentPlan.customers || 0) + 1,
              mrr: (currentPlan.mrr || 0) + (transaction.amount / 100)
            })
            .eq('id', plan_id);
          
          if (planUpdateError) {
            logStep("Warning: Could not update plan statistics", { error: planUpdateError });
          }
        }
      } catch (planError) {
        logStep("Plan statistics update failed (non-critical)", { error: planError });
      }

      logStep("Payment verification completed successfully", { 
        tenantId: tenant_id,
        planId: plan_id,
        amount: transaction.amount / 100
      });

      return new Response(JSON.stringify({ 
        success: true,
        status: 'verified',
        message: 'Payment verified and subscription activated',
        subscription: {
          tenant_id: tenant_id,
          plan_id: plan_id,
          plan_name: metadata?.plan_name || 'Unknown Plan',
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