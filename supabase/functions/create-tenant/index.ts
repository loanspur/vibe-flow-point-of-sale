import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Create tenant function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request...");
    
    const { businessName, ownerName, email } = await req.json();
    
    if (!businessName || !ownerName || !email) {
      throw new Error("Missing required fields: businessName, ownerName, email");
    }

    // Initialize Supabase with service role key
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

    console.log("Creating tenant for user:", userData.user.id);

    // Create tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName,
        subdomain: businessName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        contact_email: email,
        is_active: true,
        plan_type: 'trial',
        max_users: 5
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    console.log("Tenant created:", tenantData);

    // Get the default billing plan (cheapest - Starter)
    const { data: defaultPlan, error: planError } = await supabase
      .from('billing_plans')
      .select('id')
      .eq('name', 'Starter')
      .eq('is_active', true)
      .single();

    if (planError || !defaultPlan) {
      console.error("Default plan fetch error:", planError);
      throw new Error("Failed to get default billing plan");
    }

    // Create trial subscription record (not active payment required)
    const trialStartDate = new Date().toISOString().split('T')[0];
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { error: subscriptionError } = await supabase
      .from('tenant_subscriptions')
      .insert({
        tenant_id: tenantData.id,
        billing_plan_id: defaultPlan.id,
        reference: `trial-${tenantData.id}`,
        status: 'trial',
        amount: 0, // Free trial
        currency: 'KES',
        trial_start: trialStartDate,
        trial_end: trialEndDate,
        current_period_start: trialStartDate,
        current_period_end: trialEndDate,
        next_billing_date: trialEndDate
      });

    if (subscriptionError) {
      console.error("Subscription assignment error:", subscriptionError);
      // Don't fail tenant creation if subscription assignment fails
      console.log("Continuing without subscription assignment");
    } else {
      console.log("Default subscription assigned to tenant");
    }

    // No need to manually update profile as the trigger handles role assignment
    console.log("Tenant created successfully, triggers should handle setup");

    // Create tenant_users entry with admin role
    const { error: tenantUserError } = await supabase
      .from('tenant_users')
      .insert({
        user_id: userData.user.id,
        tenant_id: tenantData.id,
        role: 'admin',
        is_active: true
      });

    if (tenantUserError) {
      console.error("Tenant user creation error:", tenantUserError);
      // Don't fail tenant creation if this fails - user can be added later
    }

    // Get the default admin role for this tenant and assign it
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('tenant_id', tenantData.id)
      .eq('name', 'Admin')
      .single();

    if (adminRole) {
      const { error: roleAssignError } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userData.user.id,
          role_id: adminRole.id,
          tenant_id: tenantData.id,
          is_active: true
        });

      if (roleAssignError) {
        console.error("Role assignment error:", roleAssignError);
      } else {
        console.log("Admin role assigned successfully");
      }
    }


    return new Response(
      JSON.stringify({
        success: true,
        tenant: tenantData,
        message: "Tenant created successfully with default billing plan"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});