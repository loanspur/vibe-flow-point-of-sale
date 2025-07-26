import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface VerifyRequest {
  token: string;
}

serve(async (req) => {
  console.log("Verify email and create user function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let createdUserId: string | null = null;
  let createdTenantId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    
    if (!body) {
      throw new Error('Invalid request body - JSON required');
    }

    const { token }: VerifyRequest = body;

    if (!token || typeof token !== 'string') {
      throw new Error('Verification token is required and must be a string');
    }

    console.log("Processing verification token:", token);

    // Create admin Supabase client
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

    // Get pending verification
    const { data: verification, error: verificationError } = await supabaseAdmin
      .from('pending_verifications')
      .select('*')
      .eq('verification_token', token)
      .eq('status', 'pending')
      .single();

    if (verificationError) {
      if (verificationError.code === 'PGRST116') {
        throw new Error('Verification token not found or already used');
      }
      throw new Error(`Database error: ${verificationError.message}`);
    }

    if (!verification) {
      throw new Error('Verification token not found or already used');
    }

    // Check if token is expired
    if (new Date() > new Date(verification.expires_at)) {
      await supabaseAdmin
        .from('pending_verifications')
        .delete()
        .eq('verification_token', token);
      
      throw new Error('Verification token has expired. Please request a new verification email.');
    }

    // Validate required fields
    if (!verification.email || !verification.full_name || !verification.password_hash) {
      throw new Error('Incomplete verification data. Please start the signup process again.');
    }

    if (!verification.invitation_data && !verification.business_name) {
      throw new Error('Business name is required for new tenant signup');
    }

    console.log("Valid verification found for email:", verification.email);

    // Check if this is an invitation or regular signup
    if (verification.invitation_data) {
      // Handle invitation flow
      const invitationData = verification.invitation_data;
      
      // Create user account
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: verification.email,
        password: verification.password_hash,
        email_confirm: true,
        user_metadata: {
          full_name: verification.full_name
        }
      });

      if (userError) {
        if (userError.message?.includes('already been registered')) {
          await supabaseAdmin
            .from('pending_verifications')
            .update({ status: 'completed' })
            .eq('verification_token', token);
            
          return new Response(
            JSON.stringify({
              success: true,
              message: "Your email has been verified! You can now log in with your existing account.",
              user: {
                email: verification.email,
                name: verification.full_name
              },
              type: 'existing_user'
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
        throw new Error(`Failed to create user account: ${userError.message}`);
      }

      if (!userData.user) {
        throw new Error('User creation failed - no user data returned');
      }

      createdUserId = userData.user.id;

      // Return invitation success without creating tenant/profile (invitation flow handles this differently)
      await supabaseAdmin
        .from('pending_verifications')
        .update({ status: 'completed' })
        .eq('verification_token', token);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email verified and account created successfully! You can now log in.",
          user: {
            id: createdUserId,
            email: verification.email,
            name: verification.full_name
          },
          type: 'invitation'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );

    } else {
      // Handle regular signup flow - create tenant
      
      // Generate unique subdomain
      let baseSubdomain = verification.business_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      
      if (baseSubdomain.length < 3) {
        baseSubdomain = `company${Math.floor(Math.random() * 1000)}`;
      } else if (baseSubdomain.length > 20) {
        baseSubdomain = baseSubdomain.substring(0, 20);
      }
      
      let subdomain = baseSubdomain;
      let counter = 1;

      while (true) {
        const { data: existingTenant } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('subdomain', subdomain)
          .maybeSingle();

        if (!existingTenant) break;
        
        subdomain = `${baseSubdomain}${counter}`;
        counter++;
        
        if (counter > 100) {
          subdomain = `company${Date.now()}`;
          break;
        }
      }

      // Create user account
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: verification.email,
        password: verification.password_hash,
        email_confirm: true,
        user_metadata: {
          full_name: verification.full_name
        }
      });

      if (userError) {
        if (userError.message?.includes('already been registered')) {
          await supabaseAdmin
            .from('pending_verifications')
            .update({ status: 'completed' })
            .eq('verification_token', token);
            
          return new Response(
            JSON.stringify({
              success: true,
              message: "Your email has been verified! You can now log in with your existing account.",
              user: {
                email: verification.email,
                name: verification.full_name
              },
              type: 'existing_user'
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
        throw new Error(`Failed to create user account: ${userError.message}`);
      }

      if (!userData.user) {
        throw new Error('User creation failed - no user data returned');
      }

      createdUserId = userData.user.id;

      // Create tenant record
      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          name: verification.business_name,
          subdomain: subdomain,
          contact_email: verification.email,
          plan_type: 'basic',
          max_users: 10,
          is_active: true
        })
        .select()
        .single();

      if (tenantError || !tenantData) {
        throw new Error(`Failed to create tenant: ${tenantError?.message}`);
      }

      createdTenantId = tenantData.id;

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: createdUserId,
          full_name: verification.full_name,
          role: 'admin',
          tenant_id: createdTenantId
        });

      if (profileError) {
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      // Add user to tenant_users table
      const { error: tenantUserError } = await supabaseAdmin
        .from('tenant_users')
        .insert({
          user_id: createdUserId,
          tenant_id: createdTenantId,
          role: 'admin',
          is_active: true
        });

      if (tenantUserError) {
        throw new Error(`Failed to associate user with tenant: ${tenantUserError.message}`);
      }

      // Mark verification as completed
      const { error: updateError } = await supabaseAdmin
        .from('pending_verifications')
        .update({ status: 'completed' })
        .eq('verification_token', token);

      if (updateError) {
        console.error("Failed to update verification status:", updateError);
      }

      // Return success response for regular signup
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email verified and account created successfully! You can now log in.",
          tenant: {
            id: createdTenantId,
            name: verification.business_name,
            subdomain: subdomain,
            url: `https://${subdomain}.vibepos.shop`
          },
          user: {
            id: createdUserId,
            email: verification.email,
            name: verification.full_name
          },
          type: 'signup'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // This should never be reached, but just in case
    throw new Error('Unexpected flow - neither invitation nor signup processed');

  } catch (error: any) {
    console.error("Verification error:", error);

    // Cleanup on error
    if (createdUserId || createdTenantId) {
      const cleanupClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      try {
        if (createdUserId) {
          await cleanupClient.auth.admin.deleteUser(createdUserId);
        }
        if (createdTenantId) {
          await Promise.all([
            cleanupClient.from('tenant_users').delete().eq('tenant_id', createdTenantId),
            cleanupClient.from('profiles').delete().eq('tenant_id', createdTenantId),
            cleanupClient.from('tenants').delete().eq('id', createdTenantId)
          ]);
        }
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to verify email and create user"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});