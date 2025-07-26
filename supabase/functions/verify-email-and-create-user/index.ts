import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

serve(async (req) => {
  console.log("=== VERIFICATION DEBUG ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    console.log("Raw body:", JSON.stringify(body));
    
    if (!body || !body.token) {
      console.log("Missing token in body");
      throw new Error('Verification token is required');
    }

    const { token } = body;
    console.log("Extracted token:", token);
    
    // Simple success for any token for now - just to test the flow
    const response = {
      success: true,
      message: "Debug: Token received successfully",
      token_received: token,
      type: 'debug'
    };

    console.log("Returning response:", JSON.stringify(response));

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error:", error.message, error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});