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
  console.log("=== Verify email function called ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Starting verification process ===");
    
    // Parse request body
    const body = await req.json().catch((e) => {
      console.error("JSON parse error:", e);
      return null;
    });
    
    console.log("Request body:", body);
    
    if (!body) {
      console.error("No body provided");
      throw new Error('Invalid request body - JSON required');
    }

    const { token }: VerifyRequest = body;
    console.log("Token received:", token);

    if (!token || typeof token !== 'string') {
      console.error("Invalid token:", token);
      throw new Error('Verification token is required and must be a string');
    }

    // Create admin Supabase client
    console.log("Creating Supabase client...");
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
    console.log("Supabase client created");

    // Get pending verification
    console.log("Querying pending_verifications...");
    const { data: verification, error: verificationError } = await supabaseAdmin
      .from('pending_verifications')
      .select('*')
      .eq('verification_token', token)
      .eq('status', 'pending')
      .single();

    console.log("Verification query result:", { verification, verificationError });

    if (verificationError) {
      console.error("Verification query error:", verificationError);
      if (verificationError.code === 'PGRST116') {
        throw new Error('Verification token not found or already used');
      }
      throw new Error(`Database error: ${verificationError.message}`);
    }

    if (!verification) {
      console.error("No verification found");
      throw new Error('Verification token not found or already used');
    }

    console.log("Verification found:", verification.email);

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(verification.expires_at);
    console.log("Time check - Now:", now, "Expires:", expiresAt);
    
    if (now > expiresAt) {
      console.log("Token expired, deleting...");
      await supabaseAdmin
        .from('pending_verifications')
        .delete()
        .eq('verification_token', token);
      
      throw new Error('Verification token has expired. Please request a new verification email.');
    }

    console.log("=== Token validation passed ===");

    // Simple success response for now
    const successResponse = {
      success: true,
      message: "Email verified successfully! (Debug mode)",
      user: {
        email: verification.email,
        name: verification.full_name || "User"
      },
      type: 'debug'
    };

    console.log("Returning success response:", successResponse);

    return new Response(
      JSON.stringify(successResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("=== ERROR CAUGHT ===");
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", error);
    
    const errorResponse = { 
      success: false, 
      error: error.message || "Failed to verify email and create user",
      debug: {
        errorType: typeof error,
        errorStack: error.stack
      }
    };

    console.log("Returning error response:", errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});