import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[START-FREE-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { planId } = await req.json();
    
    if (!planId) {
      throw new Error("Plan ID is required");
    }

    // Initialize Supabase with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Failed to authenticate user");
    }

    logStep("User authenticated", { userId: userData.user.id, email: userData.user.email });

    // Get user's tenant
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userData.user.id)
      .eq('is_active', true)
      .single();

    if (tenantError || !tenantUser) {
      throw new Error("User tenant not found");
    }

    logStep("Tenant found", { tenantId: tenantUser.tenant_id });

    // Get the Enterprise billing plan for trials (or fallback to selected plan)
    const { data: enterprisePlan, error: enterpriseError } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('name', 'Enterprise')
      .eq('is_active', true)
      .single();

    // If Enterprise plan exists, use it for trial, otherwise use selected plan
    const trialPlan = enterprisePlan || null;
    
    // Get the originally selected plan for reference
    const { data: selectedPlan, error: planError } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !selectedPlan) {
      throw new Error("Invalid billing plan");
    }

    // Use Enterprise plan for trial if available, otherwise selected plan
    const billingPlan = trialPlan || selectedPlan;
    const finalPlanId = trialPlan ? trialPlan.id : planId;

    logStep("Trial plan configured", { 
      trialPlanName: billingPlan.name, 
      originalPlanName: selectedPlan.name,
      isEnterpriseTrial: !!trialPlan
    });

    // Check if tenant already has a subscription
    const { data: existingSub, error: subCheckError } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', tenantUser.tenant_id)
      .single();

    if (subCheckError && subCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error("Error checking existing subscription");
    }

    // Calculate trial dates
    const trialStart = new Date().toISOString().split('T')[0];
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (existingSub) {
      // Update existing subscription to trial status
      const { error: updateError } = await supabase
        .from('tenant_subscriptions')
        .update({
          billing_plan_id: finalPlanId,
          status: 'trial',
          trial_start: trialStart,
          trial_end: trialEnd,
          current_period_start: trialStart,
          current_period_end: trialEnd,
          next_billing_date: new Date(new Date(trialEnd).getFullYear(), new Date(trialEnd).getMonth() + 1, 1).toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          metadata: {
            original_plan_id: planId,
            original_plan_name: selectedPlan.name,
            enterprise_trial: !!trialPlan
          }
        })
        .eq('id', existingSub.id);

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      logStep("Updated existing subscription to trial");
    } else {
      // Create new trial subscription
      const { error: createError } = await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenantUser.tenant_id,
          billing_plan_id: finalPlanId,
          reference: `trial-${tenantUser.tenant_id}-${Date.now()}`,
          status: 'trial',
          amount: 0, // Free trial
          currency: billingPlan.currency || 'KES',
          trial_start: trialStart,
          trial_end: trialEnd,
          current_period_start: trialStart,
          current_period_end: trialEnd,
          next_billing_date: trialEnd,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            original_plan_id: planId,
            original_plan_name: selectedPlan.name,
            enterprise_trial: !!trialPlan
          }
        });

      if (createError) {
        throw new Error(`Failed to create trial subscription: ${createError.message}`);
      }

      logStep("Created new trial subscription");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Free trial started successfully with ${billingPlan.name} features`,
        trial_end: trialEnd,
        plan_name: billingPlan.name,
        original_plan: selectedPlan.name,
        enterprise_trial: !!trialPlan
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});