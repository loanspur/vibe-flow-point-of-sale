import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, phone_number, amount, reference, description } = await req.json();

    // Normalize Kenyan phone numbers to E.164 (2547XXXXXXXX)
    const normalizePhone = (raw: string) => {
      const digits = String(raw || '').replace(/\D/g, '');
      if (digits.startsWith('0') && digits.length === 10) return `254${digits.substring(1)}`;
      if (digits.startsWith('254') && digits.length === 12) return digits;
      if (digits.length === 9) return `254${digits}`;
      return digits;
    };
    const normalizedPhone = normalizePhone(phone_number);

    if (!tenant_id || !normalizedPhone || !amount || !reference) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Basic validation for Kenyan numbers
    if (!normalizedPhone.startsWith('254') || normalizedPhone.length !== 12) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid phone number format. Use 2547XXXXXXXX.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Mpesa configuration for tenant
    const { data: config, error: configError } = await supabase
      .from('mpesa_configurations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Mpesa not configured for this tenant' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate access token
    const authResult = await generateAccessToken(config);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: authResult.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initiate STK Push
    const stkResult = await initiateSTKPush({
      config,
      access_token: authResult.access_token,
      phone_number: normalizedPhone,
      amount,
      reference,
      description,
    });

    if (stkResult.success) {
      // Save transaction to database
      const { data: transaction, error: transactionError } = await supabase
        .from('mpesa_transactions')
        .insert({
          tenant_id,
          checkout_request_id: stkResult.checkout_request_id,
          merchant_request_id: stkResult.merchant_request_id,
          phone_number: normalizedPhone,
          amount,
          reference,
          description,
          status: 'pending',
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction save error:', transactionError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          checkout_request_id: stkResult.checkout_request_id,
          merchant_request_id: stkResult.merchant_request_id,
          message: 'STK push sent successfully' 
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
          message: stkResult.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('STK Push error:', error);
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

async function generateAccessToken(config: any) {
  try {
    const { consumer_key, consumer_secret, environment } = config;
    
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    const credentials = btoa(`${consumer_key}:${consumer_secret}`);
    
    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, message: 'Authentication failed' };
    }

    const data = await response.json();
    return {
      success: true,
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function initiateSTKPush(params: any) {
  try {
    const { config, access_token, phone_number, amount, reference, description } = params;
    
    const baseUrl = config.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    
    // Generate password
    const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);

    const stkPayload = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone_number,
      PartyB: config.shortcode,
      PhoneNumber: phone_number,
      CallBackURL: config.callback_url,
      AccountReference: reference,
      TransactionDesc: description || "Payment",
    };

    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const data = await response.json();

    if (response.ok && data.ResponseCode === '0') {
      return {
        success: true,
        checkout_request_id: data.CheckoutRequestID,
        merchant_request_id: data.MerchantRequestID,
        message: data.ResponseDescription,
      };
    } else {
      return {
        success: false,
        message: data.ResponseDescription || data.errorMessage || 'STK push failed',
      };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}