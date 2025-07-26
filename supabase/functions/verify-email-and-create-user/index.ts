import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

serve(async (req) => {
  console.log("=== MINIMAL TEST FUNCTION ===");
  
  if (req.method === "OPTIONS") {
    console.log("OPTIONS request - returning 200");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("POST request received");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    
    // Try to read body
    let body;
    try {
      body = await req.json();
      console.log("Body parsed successfully:", JSON.stringify(body));
    } catch (e) {
      console.error("Failed to parse JSON body:", e.message);
      throw new Error("Invalid JSON body");
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("SUPABASE_URL exists:", !!supabaseUrl);
    console.log("SERVICE_ROLE_KEY exists:", !!serviceKey);
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing environment variables");
    }

    // Return simple success
    const response = {
      success: true,
      message: "Minimal test passed",
      received: body,
      env_check: "OK"
    };

    console.log("Returning success response");
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("=== CAUGHT ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
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