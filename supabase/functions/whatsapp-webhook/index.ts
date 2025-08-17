import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  message_id: string;
  status: string;
  timestamp: string;
  phone_number: string;
  error_code?: string;
  error_message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    console.log('WhatsApp webhook received:', payload);

    // Update message status in logs
    const updateData: any = {
      status: payload.status,
      delivery_status_webhook_received_at: new Date().toISOString(),
      webhook_data: payload,
    };

    if (payload.status === 'delivered') {
      updateData.delivered_at = payload.timestamp;
    } else if (payload.status === 'read') {
      updateData.read_at = payload.timestamp;
    } else if (payload.status === 'failed') {
      updateData.failed_at = payload.timestamp;
      updateData.error_message = payload.error_message;
    }

    const { error } = await supabase
      .from('whatsapp_message_logs')
      .update(updateData)
      .eq('external_id', payload.message_id);

    if (error) {
      console.error('Error updating message status:', error);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in whatsapp-webhook function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);