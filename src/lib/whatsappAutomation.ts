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

export async function triggerWhatsAppAutomation({
  tenantId,
  eventType,
  recipientPhone,
  recipientName,
  variables = {},
  referenceId,
  referenceType
}: AutomationTriggerParams) {
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
      console.log(`No phone number available for ${eventType} automation`);
      return;
    }

    // Prepare enhanced variables
    const enhancedVariables = {
      customer_name: name || 'Customer',
      ...variables
    };

    // Send WhatsApp message with delay if specified
    const sendMessage = async () => {
      await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          tenant_id: tenantId,
          recipient_phone: phone,
          template_id: automation.template_id || undefined,
          variables: enhancedVariables,
          message: `Notification: ${eventType.replace('_', ' ')} - ${enhancedVariables.customer_name}`
        }
      });
    };

    if (automation.delay_minutes > 0) {
      // Schedule the message (in a real implementation, you'd use a job queue)
      setTimeout(sendMessage, automation.delay_minutes * 60 * 1000);
    } else {
      await sendMessage();
    }

    console.log(`WhatsApp automation triggered for ${eventType}`);
  } catch (error) {
    console.error(`WhatsApp automation failed for ${eventType}:`, error);
  }
}

// Specific trigger functions for each event type
export async function triggerReceiptAutomation(saleId: string, tenantId: string, customerId: string, receiptNumber: string) {
  console.log('triggerReceiptAutomation called with:', { saleId, tenantId, customerId, receiptNumber });
  
  // Skip automation if no customer ID or it's a walk-in customer
  if (!customerId || customerId === 'walk-in') {
    console.log('Skipping WhatsApp automation - no customer phone number available');
    return;
  }

  console.log('Proceeding with WhatsApp automation for customer:', customerId);
  
  await triggerWhatsAppAutomation({
    tenantId,
    eventType: 'receipt_created',
    referenceId: customerId,
    referenceType: 'contact',
    variables: {
      receipt_number: receiptNumber,
      sale_id: saleId
    }
  });
}

export async function triggerQuoteAutomation(quoteId: string, tenantId: string, customerId: string, quoteNumber: string) {
  await triggerWhatsAppAutomation({
    tenantId,
    eventType: 'quote_created',
    referenceId: customerId !== 'walk-in' ? customerId : undefined,
    referenceType: 'contact',
    variables: {
      quote_number: quoteNumber,
      quote_id: quoteId
    }
  });
}

export async function triggerInvoiceAutomation(invoiceId: string, tenantId: string, customerId: string, invoiceNumber: string) {
  await triggerWhatsAppAutomation({
    tenantId,
    eventType: 'invoice_created',
    referenceId: customerId !== 'walk-in' ? customerId : undefined,
    referenceType: 'contact',
    variables: {
      invoice_number: invoiceNumber,
      invoice_id: invoiceId
    }
  });
}

export async function triggerPaymentReceivedAutomation(paymentId: string, tenantId: string, customerId: string, amount: number, paymentMethod: string) {
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

export async function triggerLowStockAlert(tenantId: string, productName: string, currentStock: number, minStock: number) {
  // This would typically go to business owner/manager
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