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

  // Service role client for bypassing RLS
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !billingPlan) {
      throw new Error("Invalid plan selected");
    }

    logStep("Billing plan found", { plan: billingPlan });

    // Get tenant information
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      throw new Error("No tenant associated with user");
    }

    logStep("Tenant found", { tenantId: profile.tenant_id });

    // Check for existing Paystack customer
    let paystackCustomerId: string;
    const { data: existingSubscription } = await supabaseService
      .from('tenant_subscription_details')
      .select('paystack_customer_id')
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (existingSubscription?.paystack_customer_id) {
      paystackCustomerId = existingSubscription.paystack_customer_id;
      logStep("Using existing Paystack customer", { customerId: paystackCustomerId });
    } else {
      // Create customer in Paystack first
      const customerResponse = await fetch('https://api.paystack.co/customer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          first_name: profile.tenant_id, // You might want to get actual user name
          last_name: 'Tenant',
          metadata: {
            tenant_id: profile.tenant_id,
            user_id: user.id
          }
        })
      });

      const customerData = await customerResponse.json();
      if (!customerData.status) {
        throw new Error(`Paystack customer creation error: ${customerData.message}`);
      }

      paystackCustomerId = customerData.data.customer_code;
      logStep("Created new Paystack customer", { customerId: paystackCustomerId });
    }

    // Create Paystack subscription
    const subscriptionResponse = await fetch('https://api.paystack.co/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: paystackCustomerId,
        plan: 'monthly', // You'll need to create plans in Paystack dashboard
        amount: billingPlan.price * 100, // Amount in kobo
        metadata: {
          tenant_id: profile.tenant_id,
          billing_plan_id: billingPlan.id,
          plan_name: billingPlan.name
        }
      })
    });

    const subscriptionData = await subscriptionResponse.json();
    if (!subscriptionData.status) {
      throw new Error(`Paystack subscription error: ${subscriptionData.message}`);
    }

    const subscriptionCode = subscriptionData.data.subscription_code;
    const emailToken = subscriptionData.data.email_token;

    logStep("Paystack subscription created", { 
      subscriptionCode,
      emailToken
    });

    // Create payment history record
    const { error: paymentError } = await supabaseService
      .from('payment_history')
      .insert({
        tenant_id: profile.tenant_id,
        billing_plan_id: billingPlan.id,
        amount: billingPlan.price,
        currency: 'KES',
        payment_reference: subscriptionCode,
        payment_method: 'paystack',
        payment_status: 'pending',
        payment_type: 'subscription',
        paystack_customer_id: paystackCustomerId,
        paystack_subscription_id: subscriptionCode,
        metadata: {
          email_token: emailToken,
          plan_name: billingPlan.name
        }
      });

    if (paymentError) {
      logStep("Warning: Could not create payment history", { error: paymentError });
    }

    // Update or create subscription details
    const { error: subscriptionDetailsError } = await supabaseService
      .from('tenant_subscription_details')
      .upsert({
        tenant_id: profile.tenant_id,
        billing_plan_id: billingPlan.id,
        paystack_customer_id: paystackCustomerId,
        paystack_subscription_id: subscriptionCode,
        status: 'active',
        current_period_start: new Date().toISOString().split('T')[0],
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        trial_start: new Date().toISOString().split('T')[0],
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        metadata: {
          subscription_code: subscriptionCode,
          email_token: emailToken
        }
      }, {
        onConflict: 'tenant_id'
      });

    if (subscriptionDetailsError) {
      logStep("Warning: Could not update subscription details", { error: subscriptionDetailsError });
    }

    // Initialize the subscription using email token
    const initializeUrl = `https://checkout.paystack.com/${emailToken}`;

    return new Response(JSON.stringify({ 
      authorization_url: initializeUrl,
      reference: subscriptionCode,
      email_token: emailToken,
      subscription_id: subscriptionCode
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