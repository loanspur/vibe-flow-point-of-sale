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
    const { token }: VerifyRequest = await req.json();

    if (!token) {
      throw new Error('Verification token is required');
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

    if (verificationError || !verification) {
      throw new Error('Invalid or expired verification token');
    }

    // Check if token is expired
    if (new Date() > new Date(verification.expires_at)) {
      // Clean up expired token
      await supabaseAdmin
        .from('pending_verifications')
        .delete()
        .eq('verification_token', token);
      
      throw new Error('Verification token has expired');
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

      if (userError || !userData.user) {
        throw new Error(`Failed to create user: ${userError?.message}`);
      }

      createdUserId = userData.user.id;
      console.log("User created successfully:", createdUserId);

      // Create profile if it doesn't exist
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', createdUserId)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: createdUserId,
            full_name: verification.full_name,
            tenant_id: invitationData.tenantId
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          if (!profileError.message.includes('duplicate key')) {
            throw profileError;
          }
        }
      }

      // Add user to tenant
      const { error: tenantUserError } = await supabaseAdmin
        .from('tenant_users')
        .insert({
          user_id: createdUserId,
          tenant_id: invitationData.tenantId,
          role: 'user',
          is_active: true
        });

      if (tenantUserError) {
        console.error("Tenant user creation error:", tenantUserError);
        throw tenantUserError;
      }

      // Assign role to user
      const { error: roleError } = await supabaseAdmin
        .from('user_role_assignments')
        .insert({
          user_id: createdUserId,
          role_id: invitationData.roleId,
          tenant_id: invitationData.tenantId
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw roleError;
      }

      // Update invitation status
      const { error: invitationUpdateError } = await supabaseAdmin
        .from('user_invitations')
        .update({ status: 'accepted' })
        .eq('email', verification.email)
        .eq('tenant_id', invitationData.tenantId);

      if (invitationUpdateError) {
        console.error("Failed to update invitation status:", invitationUpdateError);
        // Don't throw error here as user is already created
      }

    } else {
      // Handle regular signup flow - create tenant
      
      // Generate unique subdomain
      const baseSubdomain = verification.business_name.toLowerCase().replace(/[^a-z0-9]/g, '');
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

      if (userError || !userData.user) {
        throw new Error(`Failed to create user: ${userError?.message}`);
      }

      createdUserId = userData.user.id;
      console.log("User created successfully:", createdUserId);

      // Create tenant record
      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          name: verification.business_name,
          subdomain: subdomain,
          contact_email: verification.email,
          plan_type: 'basic',
          max_users: 10,
          is_active: true,
          status: 'trial'
        })
        .select()
        .single();

      if (tenantError || !tenantData) {
        throw new Error(`Failed to create tenant: ${tenantError?.message}`);
      }

      createdTenantId = tenantData.id;
      console.log("Tenant created successfully:", createdTenantId);

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
        console.error("Profile creation error:", profileError);
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
        console.error("Tenant user creation error:", tenantUserError);
        throw new Error(`Failed to associate user with tenant: ${tenantUserError.message}`);
      }
    }

    // Mark verification as completed
    const { error: updateError } = await supabaseAdmin
      .from('pending_verifications')
      .update({ status: 'completed' })
      .eq('verification_token', token);

    if (updateError) {
      console.error("Failed to update verification status:", updateError);
      // Don't throw error here as user is already created
    }

    console.log("Email verification and user creation completed successfully");

    const responseData = verification.invitation_data 
      ? {
          success: true,
          message: "Email verified and account created successfully! You can now log in.",
          user: {
            id: createdUserId,
            email: verification.email,
            name: verification.full_name
          },
          type: 'invitation'
        }
      : {
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
        };

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Verification error:", error);

    // Create cleanup client
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

    // Comprehensive cleanup on any error
    try {
      if (createdUserId) {
        console.log("Cleaning up created user:", createdUserId);
        await cleanupClient.auth.admin.deleteUser(createdUserId);
      }
      if (createdTenantId) {
        console.log("Cleaning up created tenant:", createdTenantId);
        await Promise.all([
          cleanupClient.from('tenant_users').delete().eq('tenant_id', createdTenantId),
          cleanupClient.from('profiles').delete().eq('tenant_id', createdTenantId),
          cleanupClient.from('tenants').delete().eq('id', createdTenantId)
        ]);
      }
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
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