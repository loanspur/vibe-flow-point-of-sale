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
    console.log('Mpesa callback received:', req.url);
    
    // Parse the callback data
    const callbackData = await req.json();
    console.log('Callback data:', JSON.stringify(callbackData, null, 2));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extract relevant data from callback
    const { Body } = callbackData;
    if (!Body || !Body.stkCallback) {
      console.error('Invalid callback structure');
      return new Response('Invalid callback', { status: 400 });
    }

    const { stkCallback } = Body;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    console.log(`Processing callback for CheckoutRequestID: ${CheckoutRequestID}`);

    // Extract metadata if payment was successful
    let mpesaReceiptNumber = null;
    let transactionDate = null;
    let phoneNumber = null;
    let amount = null;

    if (ResultCode === 0 && CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionDate = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
          case 'Amount':
            amount = item.Value;
            break;
        }
      }
    }

    // Determine status based on result code
    let status = 'failed';
    if (ResultCode === 0) {
      status = 'success';
    } else if (ResultCode === 1032) {
      status = 'timeout'; // User cancelled
    }

    // Update transaction in database
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('mpesa_transactions')
      .update({
        status,
        result_code: ResultCode,
        result_description: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        transaction_date: transactionDate ? new Date(transactionDate.toString()).toISOString() : null,
        callback_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', CheckoutRequestID)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return new Response('Database update failed', { status: 500 });
    }

    console.log('Transaction updated successfully:', updatedTransaction?.id);

    // If payment was successful, update sale payment status
    if (status === 'success' && updatedTransaction?.sale_id) {
      try {
        // Add payment record to the sale
        const { error: paymentError } = await supabase
          .from('sale_payments')
          .insert({
            sale_id: updatedTransaction.sale_id,
            payment_method: 'mpesa',
            amount: amount || updatedTransaction.amount,
            reference_number: mpesaReceiptNumber,
            payment_date: transactionDate ? new Date(transactionDate.toString()).toISOString() : new Date().toISOString(),
            tenant_id: updatedTransaction.tenant_id,
          });

        if (paymentError) {
          console.error('Error adding payment record:', paymentError);
        } else {
          console.log('Payment record added successfully');
        }
      } catch (error) {
        console.error('Error processing sale payment:', error);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Callback processing error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});