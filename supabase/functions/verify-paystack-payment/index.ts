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
      
      // Update subscriber record
      const { error: updateError } = await supabaseClient
        .from('subscribers')
        .update({
          subscribed: true,
          subscription_tier: metadata.plan_name,
          subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
          is_trial: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', metadata.user_id);

      if (updateError) {
        logStep("Error updating subscriber", { error: updateError });
        throw new Error("Failed to update subscription status");
      }

      // Update billing plan statistics
      const { error: planUpdateError } = await supabaseClient
        .from('billing_plans')
        .update({
          customers: supabaseClient.sql`customers + 1`,
          mrr: supabaseClient.sql`mrr + ${transaction.amount / 100}`, // Convert from kobo to KES
        })
        .eq('id', metadata.plan_id);

      if (planUpdateError) {
        logStep("Warning: Could not update plan statistics", { error: planUpdateError });
      }

      logStep("Subscription activated successfully", { 
        userId: metadata.user_id, 
        planName: metadata.plan_name 
      });

      return new Response(JSON.stringify({ 
        success: true, 
        subscription: {
          plan: metadata.plan_name,
          status: 'active',
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
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