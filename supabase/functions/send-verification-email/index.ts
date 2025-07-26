
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
    // Parse request body with better error handling
    let requestData: VerificationRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request format. Please send valid JSON."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { email, fullName, businessName, password, planId, invitationData } = requestData;

    console.log("Processing verification email for:", email);

    // Validate required fields
    if (!email || !fullName || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, full name, and password are required'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Please enter a valid email address'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate business name for regular signup
    if (!invitationData && (!businessName || businessName.trim().length < 2)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Business name is required and must be at least 2 characters long'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
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

    if (!supabaseAdmin) {
      console.error("Failed to create Supabase admin client");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Service temporarily unavailable. Please try again later.'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        }
      );
    }

    // Check if email already exists in auth.users - only block if account actually exists
    try {
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error("Error checking existing users:", listError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Unable to verify account status. Please try again later.'
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      const existingUser = existingUsers?.users?.find(user => user.email === email);

      if (existingUser) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "An account with this email already exists. Please try signing in instead."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    } catch (authError) {
      console.error("Error checking auth users:", authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to verify account status. Please try again later.'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Check if there's already a pending verification for this email
    let existingPending = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('pending_email_verifications')
        .select('*')
        .eq('email', email)
        .eq('is_verified', false)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error checking pending verifications:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database error occurred. Please try again later.'
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      existingPending = data;
    } catch (dbError) {
      console.error("Database query error:", dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database connection error. Please try again later.'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update existing or create new pending verification
    try {
      if (existingPending) {
        console.log("Updating existing pending verification for:", email);
        
        const { error: updateError } = await supabaseAdmin
          .from('pending_email_verifications')
          .update({
            full_name: fullName,
            business_name: businessName,
            password: password, // Store plain password temporarily for user creation
            plan_id: planId,
            verification_token: verificationToken,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPending.id);

        if (updateError) {
          console.error("Failed to update pending verification:", updateError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to update verification record. Please try again.'
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }
      } else {
        // Create new pending verification
        const { error: insertError } = await supabaseAdmin
          .from('pending_email_verifications')
          .insert({
            email: email,
            full_name: fullName,
            business_name: businessName,
            password: password, // Store plain password temporarily for user creation
            plan_id: planId,
            verification_token: verificationToken,
            expires_at: expiresAt.toISOString()
          });

        if (insertError) {
          console.error("Failed to store pending verification:", insertError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to create verification record. Please try again.'
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }
      }
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database operation failed. Please try again later.'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Send verification email
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        console.error("RESEND_API_KEY not configured");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Email service not configured. Please contact support.'
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 503,
          }
        );
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

      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: 'VibePOS <noreply@vibepos.shop>',
        to: [email],
        subject: subject,
        html: htmlContent,
      });

      if (emailError) {
        console.error("Email sending failed:", emailError);
        
        // Clean up pending verification if email fails
        await supabaseAdmin
          .from('pending_email_verifications')
          .delete()
          .eq('verification_token', verificationToken);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to send verification email. Please check your email address and try again.'
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      console.log("Verification email sent successfully:", emailResult);
    } catch (emailError) {
      console.error("Email service error:", emailError);
      
      // Clean up pending verification if email fails
      try {
        await supabaseAdmin
          .from('pending_email_verifications')
          .delete()
          .eq('verification_token', verificationToken);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service error. Please try again later.'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const message = existingPending 
      ? "New verification email sent successfully. Please check your email to complete the process."
      : "Verification email sent successfully. Please check your email to complete the process.";

    return new Response(
      JSON.stringify({
        success: true,
        message: message,
        token: verificationToken
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Unexpected error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "An unexpected error occurred. Please try again later."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
