import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantRequest {
  businessName: string;
  ownerName: string;
  email?: string;
  phone?: string;
  address?: string;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[CREATE-TENANT] ${timestamp} - ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error(`Authentication failed: ${userError?.message}`);
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { businessName, ownerName, email, phone, address }: CreateTenantRequest = await req.json();
    
    if (!businessName || !ownerName) {
      throw new Error("Business name and owner name are required");
    }

    logStep("Creating tenant", { businessName, ownerName });

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
        contact_email: email || user.email,
        is_active: true,
        plan_type: 'trial',
        max_users: 5,
      })
      .select()
      .single();

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    logStep("Tenant created", { tenantId: tenant.id, subdomain: finalSubdomain });

    // Update user profile with tenant_id
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        tenant_id: tenant.id,
        full_name: ownerName 
      })
      .eq('user_id', user.id);

    if (profileError) {
      logStep("Warning: Failed to update profile", { error: profileError.message });
    }

    // Create tenant_users association
    const { error: tenantUserError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'owner',
        is_active: true,
      });

    if (tenantUserError) {
      throw new Error(`Failed to create tenant user association: ${tenantUserError.message}`);
    }

    logStep("User associated with tenant as owner");

    // Create business settings
    const { error: settingsError } = await supabaseAdmin
      .from('business_settings')
      .insert({
        tenant_id: tenant.id,
        company_name: businessName,
        email: email || user.email,
        phone: phone,
        address_line_1: address,
        currency_code: 'KES',
        currency_symbol: 'KSh',
        country: 'Kenya',
        timezone: 'Africa/Nairobi',
        tax_name: 'VAT',
        default_tax_rate: 16.0000,
      });

    if (settingsError) {
      logStep("Warning: Failed to create business settings", { error: settingsError.message });
    } else {
      logStep("Business settings created");
    }

    // Set up default chart of accounts
    try {
      const { error: accountsError } = await supabaseAdmin.rpc('setup_default_accounts', {
        tenant_id_param: tenant.id
      });

      if (accountsError) {
        logStep("Warning: Failed to setup default accounts", { error: accountsError.message });
      } else {
        logStep("Default accounts created");
      }
    } catch (accountsErr) {
      logStep("Warning: Error setting up accounts", { error: accountsErr });
    }

    // Create a contact record for the owner
    const { error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        name: ownerName,
        email: email || user.email,
        phone: phone,
        address: address,
        type: 'customer',
        is_active: true,
      });

    if (contactError) {
      logStep("Warning: Failed to create owner contact", { error: contactError.message });
    } else {
      logStep("Owner contact created");
    }

    logStep("Tenant setup completed successfully", { 
      tenantId: tenant.id, 
      subdomain: finalSubdomain,
      businessName 
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          contact_email: tenant.contact_email,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
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