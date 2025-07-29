import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MpesaConfig {
  consumer_key: string;
  consumer_secret: string;
  environment: 'sandbox' | 'production';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, config } = await req.json();

    if (!tenant_id || !config) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test connection by generating access token
    const authResult = await generateAccessToken(config);
    
    if (authResult.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection successful',
          token_expires_in: authResult.expires_in 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: authResult.message || 'Failed to authenticate with Mpesa API' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Test Mpesa connection error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateAccessToken(config: MpesaConfig) {
  try {
    const { consumer_key, consumer_secret, environment } = config;
    
    // Base URL based on environment
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    // Create credentials
    const credentials = btoa(`${consumer_key}:${consumer_secret}`);
    
    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mpesa auth error response:', errorText);
      return {
        success: false,
        message: `Authentication failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (data.access_token) {
      return {
        success: true,
        access_token: data.access_token,
        expires_in: data.expires_in,
      };
    } else {
      return {
        success: false,
        message: 'No access token received',
      };
    }
  } catch (error) {
    console.error('Generate access token error:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate access token',
    };
  }
}