import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { InvitationEmail } from "./_templates/invitation-email.tsx";

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
  inviterId: string;
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
    const { email, roleId, tenantId, inviterName, inviterId, companyName, roleName }: InvitationRequest = await req.json();
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

    // Get the current origin for redirect URL, prioritizing the custom domain
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://www.vibepos.shop';
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
          success: true,
          userId: userExists.id,
          message: "User is already a member of this organization" 
        }), {
          status: 200,
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
            full_name: userExists.user_metadata?.full_name || email.split('@')[0]
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

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log("About to initialize Resend with API key:", resendApiKey ? 'Key exists' : 'Key missing');
    console.log("Processing NEW USER invitation for:", email);
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      throw new Error('Email service not configured. Please contact administrator.');
    }
    
    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Generate a secure invitation token
    const invitationToken = crypto.randomUUID();

    // Generate the invitation URL
    const invitationUrl = `${origin}/accept-invitation?token=${invitationToken}`;
    console.log("Generated invitation URL:", invitationUrl);
    
    // STEP 1: Send the invitation email FIRST (before creating any database records)
    console.log("About to render email template with props:", { inviterName, companyName, roleName, invitationUrl });
    const emailHtml = await renderAsync(
      React.createElement(InvitationEmail, {
        inviterName,
        companyName,
        roleName,
        invitationUrl
      })
    );
    console.log("Email HTML rendered successfully, length:", emailHtml.length);

    // Send the invitation email using Resend
    console.log("About to send email via Resend to:", email);
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${companyName} <noreply@vibepos.shop>`,
      to: [email],
      subject: `You're invited to join ${companyName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send invitation email:', emailError);
      throw new Error(`Failed to send invitation email: ${emailError.message}`);
    }

    console.log("Invitation email sent successfully to:", email, "Result:", emailResult);

    // STEP 2: Only create invitation tracking record AFTER email sending succeeds
    const { error: trackingError } = await supabaseAdmin
      .from('user_invitations')
      .insert([{
        email: email,
        role_id: roleId,
        tenant_id: tenantId,
        invited_by: inviterId,
        invitation_token: invitationToken,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }]);

    if (trackingError) {
      console.error('Failed to create invitation tracking record:', trackingError);
      throw trackingError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitationToken: invitationToken,
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