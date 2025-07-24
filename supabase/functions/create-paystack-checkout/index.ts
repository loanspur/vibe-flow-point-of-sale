import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYSTACK-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const requestBody = await req.json();
    logStep("Request body received", requestBody);

    const { planId, isSignup } = requestBody;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      throw new Error(`Authentication error: ${authError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email, planId });

    // Get billing plan from database
    const { data: billingPlan, error: planError } = await supabaseClient
      .from('billing_plans')
      .select('*')
      .eq('id', planId) // Search by ID instead of name
      .eq('is_active', true)
      .single();

    if (planError || !billingPlan) {
      throw new Error("Invalid plan selected");
    }

    logStep("Billing plan found", { plan: billingPlan });

    // Get tenant information
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    // Create or get customer record
    let customerId: string;
    const { data: existingCustomer } = await supabaseClient
      .from('subscribers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      customerId = `ps_${user.id.slice(0, 8)}_${Date.now()}`;
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: billingPlan.price * 100, // Paystack expects amount in kobo (smallest currency unit)
        currency: 'KES',
        customer: customerId,
        metadata: {
          user_id: user.id,
          plan_id: billingPlan.id,
          plan_name: billingPlan.name,
          tenant_id: profile?.tenant_id,
          is_subscription: true,
          trial_days: 14
        },
        callback_url: `${req.headers.get("origin")}/success`,
        channels: ['card', 'bank', 'ussd', 'mobile_money'], // Enable local payment methods
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(`Paystack error: ${paystackData.message}`);
    }

    logStep("Paystack transaction initialized", { 
      reference: paystackData.data.reference,
      authorizationUrl: paystackData.data.authorization_url 
    });

    // Store transaction reference in database for tracking
    const { error: insertError } = await supabaseClient
      .from('subscribers')
      .upsert({
        user_id: user.id,
        email: user.email,
        stripe_customer_id: customerId,
        subscription_tier: billingPlan.name,
        is_trial: true,
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        subscribed: false, // Will be updated on successful payment
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      logStep("Warning: Could not update subscriber record", { error: insertError });
    }

    return new Response(JSON.stringify({ 
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in paystack-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});