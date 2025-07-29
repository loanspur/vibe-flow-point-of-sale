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
    const { tenant_id, checkout_request_id } = await req.json();

    if (!tenant_id || !checkout_request_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get transaction from database
    const { data: transaction, error: transactionError } = await supabase
      .from('mpesa_transactions')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('checkout_request_id', checkout_request_id)
      .single();

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'not_found',
          message: 'Transaction not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return current status from database
    return new Response(
      JSON.stringify({ 
        success: true,
        status: transaction.status,
        transaction_id: transaction.id,
        mpesa_receipt_number: transaction.mpesa_receipt_number,
        result_description: transaction.result_description,
        message: getStatusMessage(transaction.status)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Payment status check error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        status: 'error',
        message: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Payment is being processed...';
    case 'success':
      return 'Payment completed successfully';
    case 'failed':
      return 'Payment failed';
    case 'timeout':
      return 'Payment request timed out';
    default:
      return 'Unknown status';
  }
}