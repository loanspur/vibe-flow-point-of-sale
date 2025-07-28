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

    // Use the custom domain for invitation links
    const customDomain = 'https://vibepos.shop';
    const redirectUrl = `${customDomain}/accept-invitation`;

    console.log("Using custom domain for invitation:", customDomain);

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
          is_active: true,
          created_by: inviterId // Set the created_by field to track who invited them
        });

      if (tenantUserError) {
        console.error("Tenant user creation error:", tenantUserError);
        throw tenantUserError;
      }

      // Assign role to user - disable trigger temporarily to avoid null user_id error
      const { error: roleError } = await supabaseAdmin
        .from('user_role_assignments')
        .insert({
          user_id: userExists.id,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: inviterId
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw roleError;
      }

      // Manually log the activity since the trigger might fail with null auth.uid()
      try {
        await supabaseAdmin
          .from('user_activity_logs')
          .insert({
            tenant_id: tenantId,
            user_id: inviterId, // The person who invited (current user)
            action_type: 'user_invited',
            resource_type: 'user',
            resource_id: userExists.id,
            details: {
              invited_user_email: email,
              role_assigned: roleName,
              invitation_type: 'existing_user'
            }
          });
      } catch (logError) {
        console.error('Failed to log invitation activity:', logError);
        // Don't throw error for logging failure
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

    // Generate the invitation URL using custom domain
    const invitationUrl = `${customDomain}/accept-invitation?token=${invitationToken}`;
    console.log("Generated invitation URL:", invitationUrl);
    
    // STEP 1: Send invitation email directly using Resend with verified vibepos.shop domain
    console.log("Sending invitation email to:", email, "from verified vibepos.shop domain");
    
    // Render the invitation email
    let htmlContent;
    try {
      htmlContent = await renderAsync(
        React.createElement(InvitationEmail, {
          inviterName,
          companyName,
          invitationUrl,
          roleName
        })
      );
      console.log("Email template rendered successfully");
    } catch (renderError) {
      console.error("Email template rendering failed:", renderError);
      throw new Error(`Failed to render email template: ${renderError.message}`);
    }

    console.log("Sending email with Resend using verified vibepos.shop domain...");
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'VibePOS <noreply@vibepos.shop>', // Using verified domain
      to: [email],
      subject: `You're invited to join ${companyName} on VibePOS`,
      html: htmlContent,
    });

    console.log('Resend response:', emailData, emailError);

    if (emailError) {
      console.error('Resend error details:', emailError);
      throw new Error(`Email sending failed: ${emailError.message || emailError}`);
    }

    if (!emailData || emailData.error) {
      console.error('Resend returned error in data:', emailData);
      throw new Error(`Email sending failed: ${emailData?.error || 'Unknown error'}`);
    }

    console.log("✅ Invitation email sent successfully via vibepos.shop to:", email, "Email ID:", emailData.id);

    console.log("Invitation email sent successfully to:", email);

    // STEP 2: Handle invitation tracking record (create new or update existing pending)
    
    // First, check if there's an accepted invitation (prevent resending to accepted users)
    const { data: acceptedInvitation, error: acceptedCheckError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (acceptedCheckError) {
      console.error('Error checking accepted invitation:', acceptedCheckError);
      throw acceptedCheckError;
    }

    if (acceptedInvitation) {
      console.log("User has already accepted an invitation for this tenant");
      throw new Error(`${email} has already accepted an invitation and is part of your organization. They can sign in directly at the login page.`);
    }
    
    // Next, check if there's an existing pending invitation
    const { data: existingInvitation, error: checkError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing invitation:', checkError);
      throw checkError;
    }

    let trackingResponse;
    let isResend = false;

    if (existingInvitation) {
      // Update existing pending invitation with new token and expiration
      console.log("Updating existing pending invitation with new token");
      isResend = true;
      
      const { error: updateError } = await supabaseAdmin
        .from('user_invitations')
        .update({
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: inviterId, // Update inviter in case it changed
          role_id: roleId, // Update role in case it changed
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInvitation.id);

      if (updateError) {
        console.error('Failed to update invitation tracking record:', updateError);
        throw updateError;
      }
    } else {
      // Create new invitation tracking record
      console.log("Creating new invitation tracking record");
      
      const { error: insertError } = await supabaseAdmin
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

      if (insertError) {
        console.error('Failed to create invitation tracking record:', insertError);
        throw insertError;
      }
    }

    const responseMessage = isResend 
      ? "Invitation resent successfully with new token" 
      : "Invitation sent successfully";

    return new Response(JSON.stringify({ 
      success: true, 
      invitationToken: invitationToken,
      isResend: isResend,
      message: responseMessage
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