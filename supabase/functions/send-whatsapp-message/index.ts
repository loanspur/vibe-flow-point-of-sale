import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface WhatsAppMessageRequest {
  tenant_id: string;
  recipient_phone: string;
  message: string;
  template_id?: string;
  use_global?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenant_id, recipient_phone, message, template_id, use_global }: WhatsAppMessageRequest = await req.json();

    console.log('Sending WhatsApp message:', { tenant_id, recipient_phone, use_global });

    let apiKey: string;
    let fromPhone: string;
    let whatsappConfigId: string | null = null;

    if (use_global) {
      // Use global 360messenger API key
      apiKey = Deno.env.get('WHATSAPP_360MESSENGER_API_KEY') ?? '';
      fromPhone = 'global'; // 360messenger handles the from number
    } else {
      // Get tenant's WhatsApp configuration
      const { data: config, error: configError } = await supabase
        .from('tenant_whatsapp_configs')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .single();

      if (configError || !config) {
        throw new Error('No active WhatsApp configuration found for tenant');
      }

      apiKey = config.api_key;
      fromPhone = config.phone_number;
      whatsappConfigId = config.id;
    }

    // Send message via 360messenger API
    const whatsappResponse = await fetch('https://api.360messenger.com/v2/sendMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: recipient_phone,
        type: 'text',
        text: {
          body: message
        }
      }),
    });

    const responseData = await whatsappResponse.json();
    console.log('360messenger API response:', responseData);

    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp API error: ${responseData.message || 'Unknown error'}`);
    }

    // Log the message
    const { error: logError } = await supabase
      .from('whatsapp_message_logs')
      .insert({
        tenant_id,
        whatsapp_config_id: whatsappConfigId,
        template_id,
        recipient_phone,
        message_content: message,
        status: 'sent',
        external_id: responseData.messages?.[0]?.id || responseData.id,
        sent_at: new Date().toISOString(),
        metadata: responseData
      });

    if (logError) {
      console.error('Error logging WhatsApp message:', logError);
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: responseData.messages?.[0]?.id || responseData.id,
      status: 'sent'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in send-whatsapp-message function:', error);
    
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