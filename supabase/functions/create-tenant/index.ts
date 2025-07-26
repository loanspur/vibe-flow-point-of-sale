import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Create tenant function called - TEST VERSION");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing test request...");
    
    const requestBody = await req.json();
    console.log("Received data:", requestBody);
    
    // Just return success for now to test if function works
    return new Response(
      JSON.stringify({
        success: true,
        message: "Test function is working",
        received: requestBody
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Test function error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Test function error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});