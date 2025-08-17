import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SendWhatsAppOptions {
  recipient_phone: string;
  message: string;
  template_id?: string;
  use_global?: boolean;
  variables?: Record<string, any>;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  template_type: string;
  message_body: string;
  variables: any;
}

export const useWhatsAppService = () => {
  const [loading, setLoading] = useState(false);
  const { tenantId } = useAuth();

  const sendWhatsAppMessage = async (options: SendWhatsAppOptions) => {
    setLoading(true);
    try {
      console.log('WhatsApp service called with:', { options, tenantId });
      let finalMessage = options.message;

      // If template_id is provided, fetch and process the template
      if (options.template_id) {
        const { data: template, error: templateError } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('id', options.template_id)
          .single();

        if (templateError) {
          throw new Error('Template not found');
        }

        finalMessage = template.message_body;

        // Replace variables if provided
        if (options.variables) {
          Object.entries(options.variables).forEach(([key, value]) => {
            finalMessage = finalMessage.replace(new RegExp(`{${key}}`, 'g'), String(value));
          });
        }
      }

      console.log('Calling edge function with payload:', {
        tenant_id: tenantId,
        recipient_phone: options.recipient_phone,
        message: finalMessage,
        template_id: options.template_id,
        use_global: options.use_global || false
      });

      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          tenant_id: tenantId,
          recipient_phone: options.recipient_phone,
          message: finalMessage,
          template_id: options.template_id,
          use_global: options.use_global || false
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send WhatsApp message');
      }

      toast({
        title: "Success",
        description: "WhatsApp message sent successfully",
      });

      return data;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send WhatsApp message",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendReceiptWhatsApp = async (receipt: any, recipient_phone: string) => {
    const variables = {
      customer_name: receipt.customer_name || 'Customer',
      company_name: receipt.company_name || 'Your Company',
      receipt_number: receipt.receipt_number || receipt.id,
      date: new Date(receipt.created_at).toLocaleDateString(),
      total_amount: receipt.total_amount,
      payment_method: receipt.payment_method || 'Cash',
      item_list: receipt.items?.map((item: any) => 
        `${item.product_name} x${item.quantity} - ${item.total_price}`
      ).join('\n') || '',
      company_phone: receipt.company_phone || ''
    };

    // Try to find a receipt template
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_type', 'receipt')
      .eq('is_active', true)
      .limit(1)
      .single();

    return sendWhatsAppMessage({
      recipient_phone,
      message: template?.message_body || 'Receipt sent successfully!',
      template_id: template?.id,
      variables
    });
  };

  const sendInvoiceWhatsApp = async (invoice: any, recipient_phone: string) => {
    const variables = {
      customer_name: invoice.customer_name || 'Customer',
      company_name: invoice.company_name || 'Your Company',
      invoice_number: invoice.invoice_number || invoice.id,
      date: new Date(invoice.created_at).toLocaleDateString(),
      due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A',
      total_amount: invoice.total_amount,
      item_list: invoice.items?.map((item: any) => 
        `${item.product_name} x${item.quantity} - ${item.total_price}`
      ).join('\n') || '',
      payment_instructions: invoice.payment_instructions || 'Please contact us for payment details',
      company_phone: invoice.company_phone || ''
    };

    // Try to find an invoice template
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_type', 'invoice')
      .eq('is_active', true)
      .limit(1)
      .single();

    return sendWhatsAppMessage({
      recipient_phone,
      message: template?.message_body || 'Invoice sent successfully!',
      template_id: template?.id,
      variables
    });
  };

  const sendQuoteWhatsApp = async (quote: any, recipient_phone: string) => {
    const variables = {
      customer_name: quote.customer_name || 'Customer',
      company_name: quote.company_name || 'Your Company',
      quote_number: quote.quote_number || quote.id,
      date: new Date(quote.created_at).toLocaleDateString(),
      valid_until: quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A',
      total_amount: quote.total_amount,
      item_list: quote.items?.map((item: any) => 
        `${item.product_name} x${item.quantity} - ${item.total_price}`
      ).join('\n') || '',
      terms_conditions: quote.terms_conditions || 'Standard terms apply',
      company_phone: quote.company_phone || ''
    };

    // Try to find a quote template
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_type', 'quote')
      .eq('is_active', true)
      .limit(1)
      .single();

    return sendWhatsAppMessage({
      recipient_phone,
      message: template?.message_body || 'Quote sent successfully!',
      template_id: template?.id,
      variables
    });
  };

  const fetchTemplates = async (type?: string): Promise<WhatsAppTemplate[]> => {
    try {
      let query = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(template => ({
        ...template,
        variables: Array.isArray(template.variables) ? template.variables : []
      }));
    } catch (error) {
      console.error('Error fetching WhatsApp templates:', error);
      return [];
    }
  };

  return {
    sendWhatsAppMessage,
    sendReceiptWhatsApp,
    sendInvoiceWhatsApp,
    sendQuoteWhatsApp,
    fetchTemplates,
    loading
  };
};