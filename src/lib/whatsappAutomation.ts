import { supabase } from '@/integrations/supabase/client';

interface AutomationTriggerParams {
  tenantId: string;
  eventType: string;
  recipientPhone?: string;
  recipientName?: string;
  variables?: Record<string, any>;
  referenceId?: string;
  referenceType?: string;
}

/**
 * @deprecated This function is kept for backward compatibility only.
 * New implementations should use the unified communication system.
 * Use useUnifiedCommunication hook and its methods instead.
 */
export async function triggerWhatsAppAutomation({
  tenantId,
  eventType,
  recipientPhone,
  recipientName,
  variables = {},
  referenceId,
  referenceType
}: AutomationTriggerParams) {
  console.warn('triggerWhatsAppAutomation is deprecated. Use unified communication system instead.');
  
  try {
    console.log('triggerWhatsAppAutomation called with:', { tenantId, eventType, recipientPhone, recipientName, variables, referenceId, referenceType });
    
    // Check if automation is enabled for this event type
    const { data: automation } = await supabase
      .from('whatsapp_automation_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .eq('is_enabled', true)
      .single();

    console.log('Automation settings found:', automation);

    if (!automation) {
      console.log(`No automation enabled for event: ${eventType}`);
      return;
    }

    // If no phone provided, try to get it from contact data
    let phone = recipientPhone;
    let name = recipientName;
    
    if (!phone && referenceId && referenceType) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('phone, name')
        .eq('id', referenceId)
        .single();

      if (contact) {
        phone = contact.phone;
        name = contact.name;
      }
    }

    if (!phone) {
      console.log('No phone number available for WhatsApp automation');
      return;
    }

    // Get template for this automation
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', automation.template_id)
      .single();

    if (!template) {
      console.log('No template found for automation');
      return;
    }

    // Process message with variables
    let message = template.message_body;
    
    // Replace common variables
    const allVariables = {
      recipient_name: name || 'Customer',
      ...variables
    };

    Object.entries(allVariables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });

    console.log('Processed message:', message);

    // Send WhatsApp message using edge function
    const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        tenant_id: tenantId,
        recipient_phone: phone,
        message: message,
        template_id: template.id,
        automation_type: eventType
      }
    });

    if (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }

    console.log('WhatsApp message sent successfully:', data);
  } catch (error) {
    console.error('Error in triggerWhatsAppAutomation:', error);
    throw error;
  }
}

/**
 * @deprecated Use unified communication system instead
 * Legacy function for receipt automation
 */
export async function triggerReceiptAutomation(saleId: string, tenantId: string, customerId: string, receiptNumber: string) {
  console.warn('triggerReceiptAutomation is deprecated. Use unified communication system instead.');
  await triggerWhatsAppAutomation({
    tenantId,
    eventType: 'receipt_notification',
    referenceId: customerId,
    referenceType: 'contact',
    variables: {
      receipt_number: receiptNumber,
      sale_id: saleId
    }
  });
}

/**
 * @deprecated Use unified communication system instead
 */
export async function triggerQuoteAutomation(quoteId: string, tenantId: string, customerId: string, quoteNumber: string) {
  console.warn('triggerQuoteAutomation is deprecated. Use unified communication system instead.');
  await triggerWhatsAppAutomation({
    tenantId,
    eventType: 'quote_notification',
    referenceId: customerId,
    referenceType: 'contact',
    variables: {
      quote_number: quoteNumber,
      quote_id: quoteId
    }
  });
}

/**
 * @deprecated Use unified communication system instead
 */
export async function triggerInvoiceAutomation(invoiceId: string, tenantId: string, customerId: string, invoiceNumber: string) {
  console.warn('triggerInvoiceAutomation is deprecated. Use unified communication system instead.');
  await triggerWhatsAppAutomation({
    tenantId,
    eventType: 'invoice_notification',
    referenceId: customerId,
    referenceType: 'contact',
    variables: {
      invoice_number: invoiceNumber,
      invoice_id: invoiceId
    }
  });
}

/**
 * @deprecated Use unified communication system instead
 */
export async function triggerPaymentReceivedAutomation(paymentId: string, tenantId: string, customerId: string, amount: number, paymentMethod: string) {
  console.warn('triggerPaymentReceivedAutomation is deprecated. Use unified communication system instead.');
  await triggerWhatsAppAutomation({
    tenantId,
    eventType: 'payment_received',
    referenceId: customerId,
    referenceType: 'contact',
    variables: {
      payment_id: paymentId,
      amount: amount.toString(),
      payment_method: paymentMethod
    }
  });
}

/**
 * @deprecated Use unified communication system instead
 */
export async function sendLowStockAlert(tenantId: string, productName: string, currentStock: number, minStock: number) {
  console.warn('sendLowStockAlert is deprecated. Use unified communication system instead.');
  
  // Get business settings to find admin phone number
  const { data: businessSettings } = await supabase
    .from('business_settings')
    .select('phone')
    .eq('tenant_id', tenantId)
    .single();

  if (businessSettings?.phone) {
    await triggerWhatsAppAutomation({
      tenantId,
      eventType: 'low_stock_alert',
      recipientPhone: businessSettings.phone,
      recipientName: 'Manager',
      variables: {
        product_name: productName,
        current_stock: currentStock.toString(),
        min_stock: minStock.toString()
      }
    });
  }
}

// Legacy wrapper functions for unified communication system integration
// These preserve existing business logic while using the new unified system

/**
 * Legacy function that uses unified communication service for new implementations
 * while maintaining backward compatibility
 */
export async function triggerReceiptAutomationUnified(tenantId: string, saleData: any, customerPhone?: string, customerEmail?: string) {
  try {
    // Import and use unified communication service
    const { UnifiedCommunicationService } = await import('./unifiedCommunicationService');
    const service = new UnifiedCommunicationService(tenantId, 'tenant_admin');
    
    return await service.sendReceiptNotification(saleData, customerPhone, customerEmail);
  } catch (error) {
    console.error('Failed to send receipt notification via unified service:', error);
    // Fallback to existing automation
    if (customerPhone && saleData.customer_id) {
      await triggerReceiptAutomation(saleData.id, tenantId, saleData.customer_id, saleData.receipt_number);
    }
  }
}

/**
 * Legacy function that uses unified communication service for invoice notifications
 */
export async function triggerInvoiceAutomationUnified(tenantId: string, invoiceData: any, customerPhone?: string, customerEmail?: string) {
  try {
    const { UnifiedCommunicationService } = await import('./unifiedCommunicationService');
    const service = new UnifiedCommunicationService(tenantId, 'tenant_admin');
    
    return await service.sendInvoiceNotification(invoiceData, customerPhone, customerEmail);
  } catch (error) {
    console.error('Failed to send invoice notification via unified service:', error);
    // Fallback to existing automation
    if (customerPhone && invoiceData.customer_id) {
      await triggerInvoiceAutomation(invoiceData.id, tenantId, invoiceData.customer_id, invoiceData.invoice_number);
    }
  }
}

/**
 * Legacy function that uses unified communication service for quote notifications
 */
export async function triggerQuoteAutomationUnified(tenantId: string, quoteData: any, customerPhone?: string, customerEmail?: string) {
  try {
    const { UnifiedCommunicationService } = await import('./unifiedCommunicationService');
    const service = new UnifiedCommunicationService(tenantId, 'tenant_admin');
    
    return await service.sendQuoteNotification(quoteData, customerPhone, customerEmail);
  } catch (error) {
    console.error('Failed to send quote notification via unified service:', error);
    // Fallback to existing automation
    if (customerPhone && quoteData.customer_id) {
      await triggerQuoteAutomation(quoteData.id, tenantId, quoteData.customer_id, quoteData.quote_number);
    }
  }
}