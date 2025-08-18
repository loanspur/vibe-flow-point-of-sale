import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCommunicationService } from './unifiedCommunicationService';

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