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
    
    const { businessName, fullName, email, password, planId } = await req.json();
    
    if (!businessName || !fullName || !email || !password) {
      throw new Error("Missing required fields: businessName, fullName, email, password");
    }

    // Initialize Supabase with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Checking if user exists...");

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === email);

    let userId;
    if (existingUser) {
      console.log("User already exists:", existingUser.id);
      userId = existingUser.id;
      
      // Update user metadata if needed
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          full_name: fullName
        }
      });
      
      if (updateError) {
        console.error("User metadata update error:", updateError);
      }
    } else {
      console.log("Creating new user account...");
      
      // Create new user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email for trial
        user_metadata: {
          full_name: fullName
        }
      });

      if (authError || !authData.user) {
        console.error("User creation error:", authError);
        throw new Error(`Failed to create user account: ${authError?.message || 'Unknown error'}`);
      }

      console.log("User created:", authData.user.id);
      userId = authData.user.id;
    }

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

    // Get the selected billing plan or default to Starter
    let selectedPlanId = planId;
    if (!selectedPlanId) {
      const { data: defaultPlan, error: defaultPlanError } = await supabase
        .from('billing_plans')
        .select('id')
        .eq('name', 'Starter')
        .eq('is_active', true)
        .single();
      
      if (defaultPlanError || !defaultPlan) {
        console.error("Default plan fetch error:", defaultPlanError);
        throw new Error("Failed to get default billing plan");
      }
      selectedPlanId = defaultPlan.id;
    }

    // Verify the selected plan exists
    const { data: planData, error: planError } = await supabase
      .from('billing_plans')
      .select('id, name')
      .eq('id', selectedPlanId)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      console.error("Plan verification error:", planError);
      throw new Error("Invalid billing plan selected");
    }

    console.log("Using billing plan:", planData.name);

    // Create trial subscription record (not active payment required)
    const trialStartDate = new Date().toISOString().split('T')[0];
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { error: subscriptionError } = await supabase
      .from('tenant_subscriptions')
      .insert({
        tenant_id: tenantData.id,
        billing_plan_id: selectedPlanId,
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
        user_id: userId,
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
          user_id: userId,
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