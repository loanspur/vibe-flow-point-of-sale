import { supabase } from '@/integrations/supabase/client';
import { EmailService, TemplateEmailOptions, BaseEmailOptions } from './emailService';
import { processEmailContent, generateTenantEmailUrls, fetchBusinessDetailsForEmail } from '@/utils/emailHelpers';
import { getEnhancedTemplate } from './whatsappTemplateUtils';

/**
 * Communication channel types
 */
export type CommunicationChannel = 'email' | 'sms' | 'whatsapp';

/**
 * Communication priority levels
 */
export type CommunicationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Base communication options
 */
export interface BaseCommunicationOptions {
  channel: CommunicationChannel;
  recipient: string;
  recipientName?: string;
  message?: string;
  subject?: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority?: CommunicationPriority;
  scheduledFor?: Date;
  useGlobal?: boolean;
  tenantId?: string;
}

/**
 * SMS communication options
 */
export interface SMSOptions extends Omit<BaseCommunicationOptions, 'channel' | 'subject'> {
  channel: 'sms';
  sender?: string;
}

/**
 * WhatsApp communication options
 */
export interface WhatsAppOptions extends Omit<BaseCommunicationOptions, 'channel' | 'subject'> {
  channel: 'whatsapp';
}

/**
 * Email communication options
 */
export interface EmailOptions extends Omit<BaseCommunicationOptions, 'channel'> {
  channel: 'email';
  htmlContent?: string;
  textContent?: string;
}

/**
 * Combined communication options
 */
export type CommunicationOptions = EmailOptions | SMSOptions | WhatsAppOptions;

/**
 * Communication result interface
 */
export interface CommunicationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: CommunicationChannel;
  recipient: string;
}

/**
 * Unified Communication Service
 * Handles all communication channels (Email, SMS, WhatsApp) with a single interface
 */
export class UnifiedCommunicationService {
  private tenantId: string;
  private userRole: 'superadmin' | 'tenant_admin' | 'user';
  private showToasts: boolean;
  private emailService: EmailService;

  constructor(tenantId: string, userRole: 'superadmin' | 'tenant_admin' | 'user' = 'user', showToasts: boolean = true) {
    this.tenantId = tenantId;
    this.userRole = userRole;
    this.showToasts = showToasts;
    this.emailService = new EmailService(tenantId, showToasts);
  }

  /**
   * Handles success/error logging (toasts removed to prevent React context issues)
   */
  private handleResult(success: boolean, channel: CommunicationChannel, message?: string) {
    const channelName = channel.charAt(0).toUpperCase() + channel.slice(1);
    
    if (success) {
      console.log(`${channelName} sent successfully:`, message);
    } else {
      console.error(`Failed to send ${channel}:`, message);
    }
  }

  /**
   * Gets communication settings for the tenant
   */
  private async getCommunicationSettings(): Promise<any> {
    const { data: settings, error } = await supabase
      .from('business_settings')
      .select('sms_enable_notifications, whatsapp_enable_notifications, sms_provider, sms_api_key, whatsapp_api_key')
      .eq('tenant_id', this.tenantId)
      .single();

    if (error) {
      console.warn('Could not fetch communication settings:', error);
      return {
        sms_enable_notifications: false,
        whatsapp_enable_notifications: false
      };
    }

    return settings || {
      sms_enable_notifications: false,
      whatsapp_enable_notifications: false
    };
  }

  /**
   * Sends email communication
   */
  private async sendEmail(options: EmailOptions): Promise<CommunicationResult> {
    try {
      let result;
      
      if (options.templateId) {
        result = await this.emailService.sendTemplateEmail({
          templateId: options.templateId,
          to: options.recipient,
          toName: options.recipientName,
          variables: options.variables,
          priority: options.priority,
          scheduledFor: options.scheduledFor,
          subjectOverride: options.subject
        });
      } else {
        result = await this.emailService.sendEmail({
          to: options.recipient,
          toName: options.recipientName,
          subject: options.subject || 'Message',
          htmlContent: options.htmlContent || options.message || '',
          textContent: options.textContent,
          variables: options.variables,
          priority: options.priority,
          scheduledFor: options.scheduledFor
        });
      }

      return {
        success: true,
        messageId: result?.id,
        channel: 'email',
        recipient: options.recipient
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'email',
        recipient: options.recipient
      };
    }
  }

  /**
   * Sends SMS communication
   */
  private async sendSMS(options: SMSOptions): Promise<CommunicationResult> {
    try {
      const settings = await this.getCommunicationSettings();
      
      if (!settings.sms_enable_notifications) {
        throw new Error('SMS notifications are disabled');
      }

      let finalMessage = options.message || '';

      // Process template if provided (SMS templates would need to be created)
      if (options.templateId) {
        // For now, skip template processing for SMS as table doesn't exist
        console.warn('SMS templates not implemented yet');
      }

      // Replace variables
      if (options.variables) {
        Object.entries(options.variables).forEach(([key, value]) => {
          finalMessage = finalMessage.replace(new RegExp(`{${key}}`, 'g'), String(value));
        });
      }

      // Call SMS sending edge function
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          tenant_id: this.tenantId,
          recipient_phone: options.recipient,
          message: finalMessage,
          sender: options.sender,
          use_global: options.useGlobal || false
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send SMS');

      return {
        success: true,
        messageId: data.message_id,
        channel: 'sms',
        recipient: options.recipient
      };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'sms',
        recipient: options.recipient
      };
    }
  }

  /**
   * Sends WhatsApp communication
   */
  private async sendWhatsApp(options: WhatsAppOptions): Promise<CommunicationResult> {
    try {
      const settings = await this.getCommunicationSettings();
      
      if (!settings.whatsapp_enable_notifications) {
        throw new Error('WhatsApp notifications are disabled');
      }

      let finalMessage = options.message || '';

      // Process template if provided
      if (options.templateId) {
        const { data: template, error } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('id', options.templateId)
          .eq('tenant_id', this.tenantId)
          .single();

        if (error || !template) {
          throw new Error('WhatsApp template not found');
        }

        // Use enhanced template processing
        finalMessage = await getEnhancedTemplate(
          template.message_body,
          this.tenantId,
          undefined,
          options.variables
        );
      }

      // Call WhatsApp sending edge function
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          tenant_id: this.tenantId,
          recipient_phone: options.recipient,
          message: finalMessage,
          template_id: options.templateId,
          use_global: options.useGlobal || false
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send WhatsApp message');

      return {
        success: true,
        messageId: data.message_id,
        channel: 'whatsapp',
        recipient: options.recipient
      };
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        channel: 'whatsapp',
        recipient: options.recipient
      };
    }
  }

  /**
   * Main communication sending method
   */
  async sendCommunication(options: CommunicationOptions): Promise<CommunicationResult> {
    // Check if communication channel is enabled in business settings
    if (options.tenantId) {
      const { checkCommunicationSettings } = await import('@/lib/communicationSettingsIntegration');
      const isChannelEnabled = await checkCommunicationSettings(options.tenantId, options.channel);
      
      if (!isChannelEnabled) {
        return {
          success: false,
          channel: options.channel,
          recipient: options.recipient,
          error: `${options.channel} communication is disabled in business settings`
        };
      }
    }

    let result: CommunicationResult;

    switch (options.channel) {
      case 'email':
        result = await this.sendEmail(options as EmailOptions);
        break;
      case 'sms':
        result = await this.sendSMS(options as SMSOptions);
        break;
      case 'whatsapp':
        result = await this.sendWhatsApp(options as WhatsAppOptions);
        break;
      default:
        result = {
          success: false,
          error: `Unsupported communication channel: ${(options as any).channel}`,
          channel: (options as any).channel as CommunicationChannel,
          recipient: (options as any).recipient
        };
    }

    // Log communication attempt
    try {
      await supabase.from('communication_logs').insert({
        tenant_id: this.tenantId,
        channel: options.channel,
        recipient: options.recipient,
        type: options.templateId ? 'template' : 'direct',
        status: result.success ? 'sent' : 'failed',
        content: options.message || `Template: ${options.templateId}`,
        subject: options.channel === 'email' ? (options as EmailOptions).subject : null,
        metadata: {
          template_id: options.templateId,
          variables: options.variables,
          priority: options.priority,
          use_global: options.useGlobal,
          user_role: this.userRole
        },
        error_message: result.error,
        external_id: result.messageId
      });
    } catch (logError) {
      console.error('Failed to log communication:', logError);
    }

    this.handleResult(result.success, options.channel, result.error);
    return result;
  }

  /**
   * Sends bulk communications to multiple recipients
   */
  async sendBulkCommunication(
    recipients: Array<{ recipient: string; recipientName?: string; variables?: Record<string, any> }>,
    channel: CommunicationChannel,
    templateId: string,
    commonVariables: Record<string, any> = {}
  ): Promise<Array<CommunicationResult>> {
    const results: CommunicationResult[] = [];
    
    for (const recipientData of recipients) {
      try {
        const result = await this.sendCommunication({
          channel,
          recipient: recipientData.recipient,
          recipientName: recipientData.recipientName,
          templateId,
          variables: {
            ...commonVariables,
            ...recipientData.variables
          }
        } as CommunicationOptions);
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          channel,
          recipient: recipientData.recipient
        });
      }
    }
    
    return results;
  }

  /**
   * Business logic integration methods
   */

  // Receipt notifications
  async sendReceiptNotification(saleData: any, customerPhone?: string, customerEmail?: string): Promise<CommunicationResult[]> {
    const results: CommunicationResult[] = [];
    const variables = {
      customer_name: saleData.customer_name || 'Customer',
      receipt_number: saleData.receipt_number || saleData.id,
      date: new Date(saleData.created_at).toLocaleDateString(),
      total_amount: saleData.total_amount,
      payment_method: saleData.payment_method || 'Cash'
    };

    if (customerEmail) {
      results.push(await this.sendCommunication({
        channel: 'email',
        recipient: customerEmail,
        recipientName: variables.customer_name,
        templateId: 'receipt-notification',
        variables
      }));
    }

    if (customerPhone) {
      results.push(await this.sendCommunication({
        channel: 'whatsapp',
        recipient: customerPhone,
        recipientName: variables.customer_name,
        templateId: 'receipt',
        variables
      }));
    }

    return results;
  }

  // Invoice notifications
  async sendInvoiceNotification(invoiceData: any, customerPhone?: string, customerEmail?: string): Promise<CommunicationResult[]> {
    const results: CommunicationResult[] = [];
    const variables = {
      customer_name: invoiceData.customer_name || 'Customer',
      invoice_number: invoiceData.invoice_number || invoiceData.id,
      date: new Date(invoiceData.created_at).toLocaleDateString(),
      due_date: invoiceData.due_date ? new Date(invoiceData.due_date).toLocaleDateString() : 'N/A',
      total_amount: invoiceData.total_amount
    };

    if (customerEmail) {
      results.push(await this.sendCommunication({
        channel: 'email',
        recipient: customerEmail,
        recipientName: variables.customer_name,
        templateId: 'invoice-notification',
        variables
      }));
    }

    if (customerPhone) {
      results.push(await this.sendCommunication({
        channel: 'whatsapp',
        recipient: customerPhone,
        recipientName: variables.customer_name,
        templateId: 'invoice',
        variables
      }));
    }

    return results;
  }

  // Quote notifications
  async sendQuoteNotification(quoteData: any, customerPhone?: string, customerEmail?: string): Promise<CommunicationResult[]> {
    const results: CommunicationResult[] = [];
    const variables = {
      customer_name: quoteData.customer_name || 'Customer',
      quote_number: quoteData.quote_number || quoteData.id,
      date: new Date(quoteData.created_at).toLocaleDateString(),
      valid_until: quoteData.valid_until ? new Date(quoteData.valid_until).toLocaleDateString() : 'N/A',
      total_amount: quoteData.total_amount
    };

    if (customerEmail) {
      results.push(await this.sendCommunication({
        channel: 'email',
        recipient: customerEmail,
        recipientName: variables.customer_name,
        templateId: 'quote-notification',
        variables
      }));
    }

    if (customerPhone) {
      results.push(await this.sendCommunication({
        channel: 'whatsapp',
        recipient: customerPhone,
        recipientName: variables.customer_name,
        templateId: 'quote',
        variables
      }));
    }

    return results;
  }

  // Low stock alerts
  async sendLowStockAlert(productName: string, currentStock: number, minStock: number): Promise<CommunicationResult[]> {
    const results: CommunicationResult[] = [];
    const variables = {
      product_name: productName,
      current_stock: currentStock,
      min_stock: minStock,
      alert_date: new Date().toLocaleDateString()
    };

    // Get business manager contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('email, phone')
      .eq('tenant_id', this.tenantId)
      .eq('type', 'internal')
      .limit(5);

    if (contacts) {
      for (const contact of contacts) {
        if (contact.email) {
          results.push(await this.sendCommunication({
            channel: 'email',
            recipient: contact.email,
            templateId: 'low-stock-alert',
            variables
          }));
        }
      }
    }

    return results;
  }

  // Payment received notifications
  async sendPaymentReceivedNotification(
    paymentData: any, 
    customerPhone?: string, 
    customerEmail?: string
  ): Promise<CommunicationResult[]> {
    const results: CommunicationResult[] = [];
    const variables = {
      customer_name: paymentData.customer_name || 'Customer',
      payment_amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      payment_date: new Date(paymentData.payment_date).toLocaleDateString(),
      reference_number: paymentData.reference_number || paymentData.id
    };

    if (customerEmail) {
      results.push(await this.sendCommunication({
        channel: 'email',
        recipient: customerEmail,
        recipientName: variables.customer_name,
        templateId: 'payment-received',
        variables
      }));
    }

    if (customerPhone) {
      results.push(await this.sendCommunication({
        channel: 'whatsapp',
        recipient: customerPhone,
        recipientName: variables.customer_name,
        templateId: 'payment-received',
        variables
      }));
    }

    return results;
  }
}

/**
 * Factory function to create UnifiedCommunicationService instance
 */
export const createUnifiedCommunicationService = (
  tenantId: string, 
  userRole: 'superadmin' | 'tenant_admin' | 'user' = 'user',
  showToasts: boolean = true
): UnifiedCommunicationService => {
  return new UnifiedCommunicationService(tenantId, userRole, showToasts);
};

/**
 * Hook-style wrapper for React components
 */
export const useUnifiedCommunicationService = (
  tenantId?: string, 
  userRole: 'superadmin' | 'tenant_admin' | 'user' = 'user',
  showToasts: boolean = true
) => {
  if (!tenantId) {
    throw new Error('Tenant ID is required for unified communication service');
  }
  
  return createUnifiedCommunicationService(tenantId, userRole, showToasts);
};