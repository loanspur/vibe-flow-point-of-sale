import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface InvitationRequest {
  email: string;
  roleId: string;
  tenantId: string;
  inviterName: string;
  companyName: string;
  roleName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send user invitation function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, roleId, tenantId, inviterName, companyName, roleName }: InvitationRequest = await req.json();
    console.log("Sending invitation to:", email);

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

    // Get the current origin for redirect URL
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://qwtybhvdbbkbcelisuek.lovable.app';
    const redirectUrl = `${origin}/accept-invitation`;

    console.log("Using redirect URL:", redirectUrl);

    // Check if user already exists
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error("Error checking existing users:", getUserError);
      throw getUserError;
    }

    const userExists = existingUser.users.find(user => user.email === email);

    if (userExists) {
      console.log("User already exists, adding to tenant instead of sending invitation");
      
      // Check if user is already associated with this tenant
      const { data: existingTenantUser } = await supabaseAdmin
        .from('tenant_users')
        .select('id')
        .eq('user_id', userExists.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingTenantUser) {
        return new Response(JSON.stringify({ 
          error: "User is already a member of this organization" 
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      // Check if user has a profile, if not create one
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userExists.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: userExists.id,
            full_name: userExists.user_metadata?.full_name || email.split('@')[0],
            email: userExists.email
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Don't throw error if profile already exists due to race condition
          if (!profileError.message.includes('duplicate key')) {
            throw profileError;
          }
        }
      }

      // Add user to tenant
      const { error: tenantUserError } = await supabaseAdmin
        .from('tenant_users')
        .insert({
          user_id: userExists.id,
          tenant_id: tenantId,
          role: 'user', // Default role, will be overridden by role assignment
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
          user_id: userExists.id,
          role_id: roleId,
          tenant_id: tenantId
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw roleError;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        userId: userExists.id,
        message: "User added to organization successfully" 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Send invitation for new users
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          role_id: roleId,
          tenant_id: tenantId,
          inviter_name: inviterName,
          company_name: companyName,
          role_name: roleName
        }
      }
    );

    if (inviteError) {
      console.error("Invitation error:", inviteError);
      throw inviteError;
    }

    console.log("Invitation sent successfully:", inviteData);

    // Create invitation tracking record
    const { error: trackingError } = await supabaseAdmin
      .from('user_invitations')
      .insert([{
        email: email,
        role_id: roleId,
        tenant_id: tenantId,
        invitation_token: inviteData.user.id,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }]);

    if (trackingError) {
      console.error('Failed to create invitation tracking record:', trackingError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      userId: inviteData.user.id,
      message: "Invitation sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-user-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);