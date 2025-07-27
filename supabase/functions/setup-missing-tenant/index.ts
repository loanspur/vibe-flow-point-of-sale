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
      .maybeSingle(); // Use maybeSingle to handle case where no profile exists

    console.log("Existing profile check:", existingProfile, profileCheckError);

    // If no profile exists, create one
    if (!existingProfile && !profileCheckError) {
      console.log("Creating new profile for user");
      const { error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          role: 'user'
        });
      
      if (createProfileError) {
        console.error("Failed to create profile:", createProfileError);
        throw new Error(`Failed to create user profile: ${createProfileError.message}`);
      }
    } else if (existingProfile?.tenant_id) {
      console.log("User already has tenant:", existingProfile.tenant_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: "User already has a tenant associated"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const requestBody = await req.json();
    console.log("Request body:", requestBody);

    const { businessName, ownerName } = requestBody;
    
    if (!businessName || !ownerName) {
      throw new Error("Business name and owner name are required");
    }

    // Generate subdomain from business name
    const subdomain = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);

    // Check if subdomain is already taken
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    let finalSubdomain = subdomain;
    if (existingTenant) {
      // Add random suffix if subdomain exists
      const suffix = Math.random().toString(36).substring(2, 8);
      finalSubdomain = `${subdomain}-${suffix}`;
    }

    // Create tenant record
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: businessName,
        subdomain: finalSubdomain,
        contact_email: user.email,
        is_active: true,
        plan_type: 'trial',
        max_users: 5,
      })
      .select()
      .single();

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    // Update user profile with tenant_id and admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        tenant_id: tenant.id,
        full_name: ownerName,
        role: 'admin'
      })
      .eq('user_id', user.id);

    if (profileError) {
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    // Create tenant_users association
    const { error: tenantUserError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'admin',
        is_active: true,
      });

    if (tenantUserError) {
      throw new Error(`Failed to create tenant user association: ${tenantUserError.message}`);
    }

    // Create business settings
    await supabaseAdmin
      .from('business_settings')
      .insert({
        tenant_id: tenant.id,
        company_name: businessName,
        email: user.email,
        currency_code: 'KES',
        currency_symbol: 'KES',
        country: 'Kenya',
        timezone: 'Africa/Nairobi',
        tax_name: 'VAT',
        default_tax_rate: 16.0000,
      });

    // Set up default chart of accounts
    try {
      await supabaseAdmin.rpc('setup_default_accounts', {
        tenant_id_param: tenant.id
      });
    } catch (accountsErr) {
      console.warn('Warning: Error setting up accounts', accountsErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        }
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