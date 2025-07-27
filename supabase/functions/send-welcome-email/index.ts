import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { WelcomeEmail } from "./_templates/welcome-email.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface WelcomeEmailRequest {
  email: string;
  password: string;
  fullName: string;
  tenantName: string;
  role: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send welcome email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, tenantName, role, loginUrl }: WelcomeEmailRequest = await req.json();
    console.log("Sending welcome email to:", email);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      throw new Error('Email service not configured. Please contact administrator.');
    }
    
    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Render the email template
    const html = await renderAsync(
      React.createElement(WelcomeEmail, {
        userName: fullName,
        email: email,
        password: password,
        companyName: tenantName,
        role: role,
        loginUrl: loginUrl,
      })
    );

    const emailResponse = await resend.emails.send({
      from: `${tenantName} <onboarding@resend.dev>`,
      to: [email],
      subject: `Welcome to ${tenantName} - Your Account Details`,
      html: html,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: "Welcome email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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