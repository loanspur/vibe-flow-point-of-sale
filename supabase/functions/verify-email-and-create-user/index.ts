import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    
    if (!body || !body.token) {
      throw new Error('Verification token is required');
    }

    const { token } = body;

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Look up the pending verification
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('pending_email_verifications')
      .select('*')
      .eq('verification_token', token)
      .eq('is_verified', false)
      .maybeSingle();

    if (verifyError) {
      console.error('Database error:', verifyError);
      throw new Error('Database error occurred');
    }

    if (!verification) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if token has expired (24 hours)
    const expiresAt = new Date(verification.expires_at);
    if (new Date() > expiresAt) {
      throw new Error('Verification token has expired');
    }

    // Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: verification.email,
      password: verification.password,
      email_confirm: true // Auto-confirm since they verified via email
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      throw new Error(`Failed to create user account: ${authError.message}`);
    }

    if (!authUser.user) {
      throw new Error('Failed to create user account');
    }

    // Generate subdomain from business name
    const generateSubdomain = (businessName: string): string => {
      return businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
    };

    const subdomain = generateSubdomain(verification.business_name);

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: verification.business_name,
        owner_id: authUser.user.id,
        subdomain: subdomain,
        status: 'trial',
        is_active: true
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      // Clean up the auth user if tenant creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create business account: ${tenantError.message}`);
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        full_name: verification.full_name,
        email: verification.email,
        role: 'admin',
        tenant_id: tenant.id
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Create tenant-user relationship
    const { error: tenantUserError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: authUser.user.id,
        role: 'owner',
        is_active: true
      });

    if (tenantUserError) {
      console.error('Tenant user creation error:', tenantUserError);
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      throw new Error(`Failed to link user to business: ${tenantUserError.message}`);
    }

    // Mark verification as complete
    await supabaseAdmin
      .from('pending_email_verifications')
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq('verification_token', token);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully",
        type: "new_tenant",
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain
        },
        user: {
          id: authUser.user.id,
          email: authUser.user.email
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error:", error.message, error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});