import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MONTHLY-BILLING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Service role client for bypassing RLS
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Monthly billing processor started");

    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;
    
    logStep("Checking date", { 
      today: today.toISOString().split('T')[0], 
      isFirstOfMonth 
    });

    if (!isFirstOfMonth) {
      logStep("Not the 1st of the month, skipping processing");
      return new Response(JSON.stringify({ 
        message: "Not billing day", 
        next_billing_date: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0] 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get all active subscriptions that need billing today
    const { data: subscriptions, error: subsError } = await supabaseService
      .from('tenant_subscription_details')
      .select(`
        *,
        billing_plans (
          id,
          name,
          price,
          is_active
        )
      `)
      .eq('status', 'active')
      .eq('billing_day', 1)
      .lte('next_billing_date', today.toISOString().split('T')[0]);

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    logStep("Found subscriptions to process", { count: subscriptions?.length || 0 });

    const results = [];

    for (const subscription of subscriptions || []) {
      try {
        logStep("Processing subscription", { 
          tenantId: subscription.tenant_id,
          planName: subscription.billing_plans?.name 
        });

        // Calculate billing amount (ensure whole number for monthly billing)
        const rawAmount = subscription.next_billing_amount || subscription.billing_plans?.price;
        const billingAmount = Math.round(rawAmount); // Ensure whole number
        
        if (!billingAmount) {
          logStep("Skipping subscription - no billing amount", { tenantId: subscription.tenant_id });
          continue;
        }

        // Create Paystack transaction for recurring billing
        const transactionResponse = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: subscription.paystack_customer_id, // This should be the customer email
            amount: billingAmount * 100, // Amount in kobo (billingAmount already rounded)
            currency: 'KES',
            reference: `monthly_${subscription.tenant_id}_${Date.now()}`,
            customer: subscription.paystack_customer_id,
            metadata: {
              tenant_id: subscription.tenant_id,
              billing_plan_id: subscription.billing_plan_id,
              plan_name: subscription.billing_plans?.name,
              payment_type: 'recurring_subscription',
              billing_cycle: 'monthly',
              billing_date: today.toISOString().split('T')[0]
            }
          })
        });

        const transactionData = await transactionResponse.json();
        
        if (!transactionData.status) {
          logStep("Failed to create transaction", { 
            tenantId: subscription.tenant_id,
            error: transactionData.message 
          });
          continue;
        }

        const reference = transactionData.data.reference;
        
        // Create payment history record
        await supabaseService
          .from('payment_history')
          .insert({
            tenant_id: subscription.tenant_id,
            billing_plan_id: subscription.billing_plan_id,
            amount: billingAmount,
            currency: 'KES',
            payment_reference: reference,
            payment_method: 'paystack',
            payment_status: 'pending',
            payment_type: 'recurring_subscription',
            paystack_customer_id: subscription.paystack_customer_id,
            is_prorated: false,
            full_period_amount: billingAmount,
            billing_period_start: today.toISOString().split('T')[0],
            billing_period_end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
            metadata: {
              plan_name: subscription.billing_plans?.name,
              transaction_reference: reference,
              billing_cycle: 'monthly',
              auto_generated: true
            }
          });

        // Update subscription with next billing date
        const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        await supabaseService
          .from('tenant_subscription_details')
          .update({
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
            current_period_start: today.toISOString().split('T')[0],
            current_period_end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
            is_prorated_period: false,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', subscription.tenant_id);

        results.push({
          tenant_id: subscription.tenant_id,
          billing_amount: billingAmount,
          reference: reference,
          status: 'processed',
          next_billing_date: nextBillingDate.toISOString().split('T')[0]
        });

        logStep("Successfully processed subscription", { 
          tenantId: subscription.tenant_id,
          amount: billingAmount,
          reference 
        });

      } catch (error) {
        logStep("Error processing subscription", { 
          tenantId: subscription.tenant_id,
          error: error instanceof Error ? error.message : String(error)
        });
        
        results.push({
          tenant_id: subscription.tenant_id,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logStep("Monthly billing processing completed", { 
      totalProcessed: results.length,
      successful: results.filter(r => r.status === 'processed').length,
      failed: results.filter(r => r.status === 'failed').length
    });

    return new Response(JSON.stringify({ 
      success: true,
      processed_date: today.toISOString().split('T')[0],
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'processed').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in monthly billing processor", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});