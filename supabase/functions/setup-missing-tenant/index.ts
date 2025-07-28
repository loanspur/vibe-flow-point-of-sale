import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Setup missing tenant function started");

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Supabase admin client initialized");

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header provided");
    }

    console.log("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Authentication failed:", userError);
      throw new Error(`Authentication failed: ${userError?.message}`);
    }

    const user = userData.user;
    console.log("User authenticated:", { userId: user.id, email: user.email });
    
    // Check if user already has a tenant or create profile if needed
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log("Existing profile check:", existingProfile, profileCheckError);

    if (existingProfile?.tenant_id) {
      console.log("User already has tenant:", existingProfile.tenant_id);
      return new Response(
        JSON.stringify({
          success: true,
          message: "User already has a tenant associated",
          tenantId: existingProfile.tenant_id
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If profile doesn't exist, we'll create it in the create-tenant function
    if (!existingProfile && !profileCheckError) {
      console.log("No profile found, will be created during tenant setup");
    }

    const requestBody = await req.json();
    console.log("Request body:", requestBody);

    const { businessName, ownerName, email } = requestBody;
    
    // Use email from request body if provided, otherwise use authenticated user's email
    const targetEmail = email || user.email;
    const targetBusinessName = businessName;
    const targetOwnerName = ownerName || user.user_metadata?.full_name || 'Business Owner';
    
    if (!targetBusinessName || !targetOwnerName) {
      throw new Error("Business name and owner name are required");
    }

    // Call the unified create-tenant function for existing users
    const createTenantUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-tenant`;
    const createTenantResponse = await fetch(createTenantUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        businessName: targetBusinessName,
        ownerName: targetOwnerName,
        email: targetEmail,
        isExistingUser: true,
        existingUserId: user.id,
        planType: 'trial',
        maxUsers: 10,
        isAdminCreated: false
      })
    });

    const createTenantResult = await createTenantResponse.json();
    
    if (!createTenantResult.success) {
      throw new Error(createTenantResult.error || "Failed to create tenant");
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant: createTenantResult.tenant
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Setup missing tenant error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});