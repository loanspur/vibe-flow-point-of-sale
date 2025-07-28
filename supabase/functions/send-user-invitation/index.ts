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
  console.log("📨 EDGE FUNCTION CALLED - send-user-invitation");
  console.log("🔧 Request method:", req.method);
  console.log("🌐 Request URL:", req.url);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("✅ Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, roleId, tenantId, inviterName, inviterId, companyName, roleName }: InvitationRequest = await req.json();
    console.log("🎯 Processing invitation request for:", email);
    console.log("📋 Request details:", { email, roleId, tenantId, inviterName, companyName, roleName });

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

    // Use Lovable project URL temporarily until wildcard subdomain is implemented
    const customDomain = 'https://688144f7-8c84-4c49-852f-f9a8fcd9dad6.lovableproject.com';
    const redirectUrl = `${customDomain}/accept-invitation`;

    console.log("Using Lovable project URL for invitation:", customDomain);

    // Skip user existence check for resend invitations - proceed directly to email sending
    console.log("🔄 Processing invitation/resend request for:", email);

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
    
    // Simplified approach - just check for existing pending invitations and update/create
    console.log("Checking for existing pending invitations...");
    
    const { data: existingInvitation, error: checkError } = await supabaseAdmin
      .from('user_invitations')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing invitation:', checkError);
      // Don't throw error here, just log and continue with creating new invitation
    }

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
        // Don't throw error, email was already sent successfully
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
        // Don't throw error, email was already sent successfully
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