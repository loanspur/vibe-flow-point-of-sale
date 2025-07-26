import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface VerificationRequest {
  email: string;
  fullName: string;
  businessName: string;
  password: string;
  planId?: string;
  invitationData?: {
    roleId: string;
    tenantId: string;
    inviterName: string;
    inviterId: string;
    companyName: string;
    roleName: string;
  };
}

serve(async (req) => {
  console.log("Send verification email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: VerificationRequest = await req.json();
    const { email, fullName, businessName, password, planId, invitationData } = requestData;

    console.log("Sending verification email to:", email);

    // Validate required fields
    if (!email || !fullName) {
      throw new Error('Email and full name are required');
    }

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

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(user => user.email === email);

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store pending verification
    const { error: insertError } = await supabaseAdmin
      .from('pending_verifications')
      .insert({
        email: email,
        full_name: fullName,
        business_name: businessName,
        password_hash: password, // We'll hash this on verification
        plan_id: planId,
        invitation_data: invitationData,
        verification_token: verificationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      });

    if (insertError) {
      console.error("Failed to store pending verification:", insertError);
      throw new Error(`Failed to create verification record: ${insertError.message}`);
    }

    // Send verification email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('Email service not configured');
    }

    const resend = new Resend(resendApiKey);
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://www.vibepos.shop';
    const verificationUrl = `${origin}/verify-email?token=${verificationToken}`;

    const emailType = invitationData ? 'invitation' : 'signup';
    const subject = invitationData 
      ? `You're invited to join ${invitationData.companyName}` 
      : `Verify your email to complete VibePOS signup`;

    const htmlContent = invitationData 
      ? `
        <h1>You're invited to join ${invitationData.companyName}!</h1>
        <p>Hi ${fullName},</p>
        <p>${invitationData.inviterName} has invited you to join ${invitationData.companyName} as a ${invitationData.roleName}.</p>
        <p>To accept this invitation and complete your account setup, please verify your email address:</p>
        <p><a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email & Accept Invitation</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The VibePOS Team</p>
      `
      : `
        <h1>Welcome to VibePOS!</h1>
        <p>Hi ${fullName},</p>
        <p>Thank you for signing up for VibePOS! To complete your account creation for <strong>${businessName}</strong>, please verify your email address:</p>
        <p><a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email & Complete Signup</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The VibePOS Team</p>
      `;

    const { error: emailError } = await resend.emails.send({
      from: 'VibePOS <noreply@vibepos.shop>',
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (emailError) {
      // Clean up pending verification if email fails
      await supabaseAdmin
        .from('pending_verifications')
        .delete()
        .eq('verification_token', verificationToken);
      
      throw new Error(`Failed to send verification email: ${emailError.message}`);
    }

    console.log("Verification email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification email sent successfully. Please check your email to complete the process.",
        token: verificationToken
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send verification email"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});