import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYSTACK-WEBHOOK] ${step}${detailsStr}`);
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
    logStep("Webhook received");

    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    // Verify webhook signature using Web Crypto API
    const encoder = new TextEncoder();
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY") + body;
    const keyData = encoder.encode(secretKey);
    const hashBuffer = await crypto.subtle.digest("SHA-512", keyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== expectedSignature) {
      logStep("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    logStep("Webhook event", { event: event.event, data: event.data });

    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulPayment(supabaseClient, event.data);
        break;
      
      case 'subscription.create':
        await handleSubscriptionCreated(supabaseClient, event.data);
        break;
      
      case 'subscription.disable':
        await handleSubscriptionCancelled(supabaseClient, event.data);
        break;
      
      case 'invoice.create':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(supabaseClient, event);
        break;
      
      default:
        logStep("Unhandled event type", { event: event.event });
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in paystack-webhook", { message: errorMessage });
    return new Response("Error processing webhook", { status: 500 });
  }
});

async function handleSuccessfulPayment(supabaseClient: any, data: any) {
  logStep("Processing successful payment", { reference: data.reference });
  
  const metadata = data.metadata;
  let tenantId = metadata?.tenant_id;
  let billingPlanId = metadata?.billing_plan_id;
  
  // If not in metadata, extract from payment reference format: sub_{tenant_id}_{timestamp}
  if (!tenantId && data.reference.startsWith('sub_')) {
    const referenceParts = data.reference.split('_');
    if (referenceParts.length >= 2) {
      tenantId = referenceParts[1];
    }
  }
  
  // Get plan_id from existing payment record if not in metadata
  if (!billingPlanId) {
    const { data: paymentRecord } = await supabaseClient
      .from('payment_history')
      .select('billing_plan_id, tenant_id')
      .eq('payment_reference', data.reference)
      .single();
    
    if (paymentRecord) {
      billingPlanId = paymentRecord.billing_plan_id;
      tenantId = tenantId || paymentRecord.tenant_id;
    }
  }
  
  if (!tenantId) {
    logStep("No tenant_id found, skipping", { reference: data.reference });
    return;
  }

  try {
    // Update payment history
    const { error: paymentError } = await supabaseClient
      .from('payment_history')
      .update({
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        metadata: data
      })
      .eq('payment_reference', data.reference);

    if (paymentError) {
      logStep("Warning: Could not update payment history", { error: paymentError });
    }

    // Update subscription details
    if (billingPlanId) {
      const { error: subscriptionError } = await supabaseClient
        .from('tenant_subscription_details')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString().split('T')[0],
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          metadata: {
            last_payment_reference: data.reference,
            last_payment_amount: data.amount / 100,
            payment_verified_at: new Date().toISOString()
          }
        })
        .eq('tenant_id', tenantId)
        .eq('billing_plan_id', billingPlanId);

      if (subscriptionError) {
        logStep("Warning: Could not update subscription details", { error: subscriptionError });
      }

      // Update tenant subscription table for backward compatibility
      const { error: tenantSubError } = await supabaseClient
        .from('tenant_subscriptions')
        .upsert({
          tenant_id: tenantId,
          billing_plan_id: billingPlanId,
          status: 'active',
          amount: data.amount / 100,
          currency: 'KES',
          reference: data.reference,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (tenantSubError) {
        logStep("Warning: Could not update tenant subscription", { error: tenantSubError });
      }
    }

    logStep("Payment processed successfully", { reference: data.reference, tenantId, amount: data.amount });
  } catch (error) {
    logStep("Error processing successful payment", error);
    throw error;
  }
}

async function handleSubscriptionCreated(supabaseClient: any, data: any) {
  logStep("Processing subscription created", { customer: data.customer });
  
  try {
    const metadata = data.metadata;
    const tenantId = metadata?.tenant_id;
    const billingPlanId = metadata?.billing_plan_id;
    
    if (!tenantId) {
      logStep("Warning: No tenant_id in subscription metadata");
      return;
    }

    // Create payment history record for subscription
    const { error: paymentError } = await supabaseClient
      .from('payment_history')
      .insert({
        tenant_id: tenantId,
        billing_plan_id: billingPlanId,
        amount: data.amount / 100,
        currency: 'KES',
        payment_reference: data.subscription_code,
        payment_status: 'completed',
        payment_type: 'subscription',
        paystack_subscription_id: data.subscription_code,
        paid_at: new Date().toISOString(),
        billing_period_start: new Date().toISOString().split('T')[0],
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        metadata: data
      });

    if (paymentError) {
      logStep("Warning: Could not create payment history for subscription", { error: paymentError });
    }

    logStep("Subscription creation processed", { subscription_code: data.subscription_code, tenantId });
  } catch (error) {
    logStep("Error processing subscription creation", error);
    throw error;
  }
}

async function handleSubscriptionCancelled(supabaseClient: any, data: any) {
  logStep("Processing subscription cancelled", { customer: data.customer });
  
  try {
    const subscriptionCode = data.subscription_code;
    
    // Update subscription details
    const { error: subscriptionError } = await supabaseClient
      .from('tenant_subscription_details')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('paystack_subscription_id', subscriptionCode);

    if (subscriptionError) {
      logStep("Warning: Could not update subscription details", { error: subscriptionError });
    }

    // Update tenant subscription
    const { error: tenantSubError } = await supabaseClient
      .from('tenant_subscriptions')
      .update({
        status: 'cancelled'
      })
      .eq('reference', subscriptionCode);

    if (tenantSubError) {
      logStep("Warning: Could not update tenant subscription", { error: tenantSubError });
    }

    logStep("Subscription cancellation processed", { subscription_code: subscriptionCode });
  } catch (error) {
    logStep("Error processing subscription cancellation", error);
    throw error;
  }
}

async function handleInvoiceEvent(supabaseClient: any, event: any) {
  logStep("Processing invoice event", { event: event.event });
  
  try {
    const data = event.data;
    const metadata = data.metadata;
    const tenantId = metadata?.tenant_id;
    const billingPlanId = metadata?.billing_plan_id;

    if (event.event === 'invoice.payment_failed') {
      logStep("Payment failed for invoice", { invoice_code: data.invoice_code, amount: data.amount });
      
      // Update payment history if exists
      const { error: paymentError } = await supabaseClient
        .from('payment_history')
        .update({
          payment_status: 'failed',
          failed_at: new Date().toISOString(),
          metadata: data
        })
        .eq('payment_reference', data.invoice_code);

      if (paymentError) {
        logStep("Warning: Could not update payment history", { error: paymentError });
      }

      // Update subscription status to past_due
      if (tenantId) {
        const { error: subscriptionError } = await supabaseClient
          .from('tenant_subscription_details')
          .update({
            status: 'past_due'
          })
          .eq('tenant_id', tenantId);

        if (subscriptionError) {
          logStep("Warning: Could not update subscription status", { error: subscriptionError });
        }
      }
    } else if (event.event === 'invoice.create') {
      // Record the invoice creation
      if (tenantId && billingPlanId) {
        const { error: paymentError } = await supabaseClient
          .from('payment_history')
          .insert({
            tenant_id: tenantId,
            billing_plan_id: billingPlanId,
            amount: data.amount / 100,
            currency: 'KES',
            payment_reference: data.invoice_code,
            payment_status: 'pending',
            payment_type: 'subscription',
            metadata: data
          });

        if (paymentError) {
          logStep("Warning: Could not create payment history for invoice", { error: paymentError });
        }
      }
    }

    logStep("Invoice event processed", { invoice_code: data.invoice_code, eventType: event.event });
  } catch (error) {
    logStep("Error processing invoice event", error);
    throw error;
  }
}