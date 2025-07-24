import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHash } from "https://deno.land/std@0.190.0/crypto/mod.ts";

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
    
    // Verify webhook signature
    const hash = createHash("sha512");
    hash.update(Deno.env.get("PAYSTACK_SECRET_KEY") + body);
    const expectedSignature = hash.toString("hex");

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
  if (!metadata?.user_id) {
    logStep("No user_id in metadata, skipping");
    return;
  }

  // Update subscriber status
  const { error } = await supabaseClient
    .from('subscribers')
    .update({
      subscribed: true,
      subscription_tier: metadata.plan_name,
      subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', metadata.user_id);

  if (error) {
    logStep("Error updating subscriber", { error });
  } else {
    logStep("Subscriber updated successfully", { userId: metadata.user_id });
  }
}

async function handleSubscriptionCreated(supabaseClient: any, data: any) {
  logStep("Processing subscription created", { customer: data.customer });
  
  // Handle subscription creation if needed
  // This would typically involve setting up recurring billing
}

async function handleSubscriptionCancelled(supabaseClient: any, data: any) {
  logStep("Processing subscription cancelled", { customer: data.customer });
  
  // Find and update subscriber
  const { error } = await supabaseClient
    .from('subscribers')
    .update({
      subscribed: false,
      subscription_end: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', data.customer.customer_code);

  if (error) {
    logStep("Error cancelling subscription", { error });
  } else {
    logStep("Subscription cancelled successfully");
  }
}

async function handleInvoiceEvent(supabaseClient: any, event: any) {
  logStep("Processing invoice event", { event: event.event });
  
  // Handle invoice events for subscription renewals
  if (event.event === 'invoice.payment_failed') {
    // You might want to notify the user or update subscription status
    logStep("Payment failed for invoice", { invoice: event.data });
  }
}