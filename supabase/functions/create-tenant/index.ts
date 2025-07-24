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
        owner_id: userData.user.id,
        is_active: true
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

    // Assign default billing plan to tenant
    const { error: subscriptionError } = await supabase
      .from('tenant_subscriptions')
      .insert({
        tenant_id: tenantData.id,
        billing_plan_id: defaultPlan.id,
        reference: `default-${tenantData.id}`,
        status: 'active',
        amount: 500,
        currency: 'NGN',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      });

    if (subscriptionError) {
      console.error("Subscription assignment error:", subscriptionError);
      // Don't fail tenant creation if subscription assignment fails
      console.log("Continuing without subscription assignment");
    } else {
      console.log("Default subscription assigned to tenant");
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        tenant_id: tenantData.id
      })
      .eq('user_id', userData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Create tenant_users entry
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