import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { processEmailContent, generateTenantEmailUrls, fetchBusinessDetailsForEmail } from '@/utils/emailHelpers';
import { EMAIL_TEMPLATES } from './systemConstants';

/**
 * Core email options interface
 */
export interface BaseEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
}

/**
 * Template email options interface
 */
export interface TemplateEmailOptions {
  templateId: string;
  to: string;
  toName?: string;
  variables?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
  subjectOverride?: string;
}

/**
 * Email template structure
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables?: Record<string, any>;
}

/**
 * Unified email service class
 */
export class EmailService {
  private tenantId: string;
  private showToasts: boolean;

  constructor(tenantId: string, showToasts: boolean = true) {
    this.tenantId = tenantId;
    this.showToasts = showToasts;
  }

  /**
   * Validates UUID format
   */
  private isUUID(str: string): boolean {
    // Simple check for UUID format: 8-4-4-4-12 characters with hyphens
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const result = uuidPattern.test(str);
    console.log('UUID validation:', { str, isUUID: result });
    return result;
  }

  /**
   * Handles success/error toasts
   */
  private handleResult(success: boolean, message?: string) {
    if (!this.showToasts) return;
    
    if (success) {
      toast({
        title: "Success",
        description: message || "Email sent successfully",
      });
    } else {
      toast({
        title: "Error",
        description: message || "Failed to send email",
        variant: "destructive",
      });
    }
  }

  /**
   * Core email sending function
   */
  async sendEmail(options: BaseEmailOptions): Promise<any> {
    try {
      if (!this.tenantId) {
        throw new Error('No tenant ID available');
      }

      const response = await supabase.functions.invoke('send-enhanced-email', {
        body: {
          ...options,
          tenantId: this.tenantId,
          scheduledFor: options.scheduledFor?.toISOString()
        }
      });

      if (response.error) throw response.error;

      this.handleResult(true);
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      this.handleResult(false, 'Failed to send email');
      throw error;
    }
  }

  /**
   * Fetches email template by ID or name
   */
  async fetchTemplate(templateId: string): Promise<EmailTemplate> {
    const isUUID = this.isUUID(templateId);
    
    console.log('EmailService.fetchTemplate called with:', { templateId, isUUID });
    
    const query = supabase
      .from('email_templates')
      .select('*')
      .eq(isUUID ? 'id' : 'name', templateId)
      .maybeSingle();

    console.log('EmailService.fetchTemplate query column:', isUUID ? 'id' : 'name');

    const { data: template, error } = await query;

    if (error) {
      console.error('Error fetching template:', error);
      throw new Error(`Template "${templateId}" not found: ${error.message}`);
    }
    
    if (!template) {
      console.error(`Template "${templateId}" does not exist in the database`);
      throw new Error(`Email template "${templateId}" not found. Please create this template first.`);
    }

    return template as EmailTemplate;
  }

  /**
   * Processes template variables with tenant context
   */
  async processTemplateContent(
    template: EmailTemplate, 
    variables: Record<string, any>
  ): Promise<{ subject: string; htmlContent: string; textContent: string; processedVariables: Record<string, any> }> {
    // Enhanced variables with tenant-specific URLs and business details
    const tenantUrls = await generateTenantEmailUrls(this.tenantId);
    const { businessSettings, primaryLocation } = await fetchBusinessDetailsForEmail(this.tenantId);
    
    const enhancedVariables = {
      ...variables,
      ...tenantUrls,
      // Business settings variables
      company_name: businessSettings.company_name || 'Your Company',
      company_phone: businessSettings.phone || '',
      company_email: businessSettings.email || '',
      company_address: [
        businessSettings.address_line_1,
        businessSettings.address_line_2,
        businessSettings.city,
        businessSettings.state_province,
        businessSettings.postal_code,
        businessSettings.country
      ].filter(Boolean).join(', '),
      company_logo_url: businessSettings.company_logo_url || '',
      currency_symbol: businessSettings.currency_symbol || '$',
      currency_code: businessSettings.currency_code || 'USD',
      // Location variables
      location_name: primaryLocation.name || '',
      location_address: primaryLocation.address || '',
      location_phone: primaryLocation.phone || '',
      location_email: primaryLocation.email || '',
      // Default tenant variables
      tenant_id: this.tenantId
    };

    // Process template content
    let processedSubject = template.subject;
    let processedHtml = template.html_content;
    let processedText = template.text_content || '';

    for (const [key, value] of Object.entries(enhancedVariables)) {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder, 'g');
      const stringValue = String(value);
      
      processedSubject = processedSubject.replace(regex, stringValue);
      processedHtml = processedHtml.replace(regex, stringValue);
      processedText = processedText.replace(regex, stringValue);
    }

    return {
      subject: processedSubject,
      htmlContent: processedHtml,
      textContent: processedText,
      processedVariables: enhancedVariables
    };
  }

  /**
   * Sends template-based email
   */
  async sendTemplateEmail(options: TemplateEmailOptions): Promise<any> {
    try {
      console.log('EmailService.sendTemplateEmail called with:', options);
      
      // Fetch template
      const template = await this.fetchTemplate(options.templateId);
      
      // Process template content
      const { subject, htmlContent, textContent, processedVariables } = await this.processTemplateContent(
        template, 
        options.variables || {}
      );

      // Send email
      return await this.sendEmail({
        to: options.to,
        toName: options.toName,
        subject: options.subjectOverride || subject,
        htmlContent,
        textContent,
        variables: processedVariables,
        priority: options.priority,
        scheduledFor: options.scheduledFor
      });
    } catch (error) {
      console.error('Error sending template email:', error);
      this.handleResult(false, 'Failed to send template email');
      throw error;
    }
  }

  /**
   * Sends welcome email
   */
  async sendWelcomeEmail(userEmail: string, userName: string, companyName?: string): Promise<any> {
    const tenantUrls = await generateTenantEmailUrls(this.tenantId);
    
    return this.sendTemplateEmail({
      templateId: 'welcome',
      to: userEmail,
      toName: userName,
      variables: {
        user_name: userName,
        company_name: companyName || 'Your Company',
        login_url: tenantUrls.loginUrl,
        dashboard_url: tenantUrls.dashboardUrl
      }
    });
  }

  /**
   * Sends password reset email
   */
  async sendPasswordResetEmail(userEmail: string, userName: string, resetUrl: string): Promise<any> {
    // Extract token and type from reset URL for tenant domain adjustment
    let tenantResetUrl = resetUrl;
    try {
      const url = new URL(resetUrl);
      const token = url.searchParams.get('token');
      const type = url.searchParams.get('type');
      
      if (token && type) {
        const tenantUrls = await generateTenantEmailUrls(this.tenantId);
        tenantResetUrl = `${tenantUrls.passwordResetUrl}?token=${token}&type=${type}`;
      }
    } catch (error) {
      console.warn('Could not process reset URL for tenant domain:', error);
    }

    return this.sendTemplateEmail({
      templateId: 'password_reset',
      to: userEmail,
      toName: userName,
      variables: {
        user_name: userName,
        reset_url: tenantResetUrl
      }
    });
  }

  /**
   * Sends order confirmation email
   */
  async sendOrderConfirmationEmail(
    customerEmail: string,
    customerName: string,
    orderDetails: {
      orderNumber: string;
      totalAmount: string;
      orderDate: string;
      orderUrl?: string;
    }
  ): Promise<any> {
    const tenantUrls = await generateTenantEmailUrls(this.tenantId);
    
    return this.sendTemplateEmail({
      templateId: 'order_confirmation',
      to: customerEmail,
      toName: customerName,
      variables: {
        customer_name: customerName,
        order_number: orderDetails.orderNumber,
        total_amount: orderDetails.totalAmount,
        order_date: orderDetails.orderDate,
        order_url: orderDetails.orderUrl || tenantUrls.dashboardUrl
      }
    });
  }

  /**
   * Sends invoice notification email
   */
  async sendInvoiceNotificationEmail(
    customerEmail: string,
    customerName: string,
    invoiceDetails: {
      invoiceNumber: string;
      totalAmount: string;
      dueDate: string;
      invoiceUrl?: string;
    }
  ): Promise<any> {
    const tenantUrls = await generateTenantEmailUrls(this.tenantId);
    
    return this.sendTemplateEmail({
      templateId: EMAIL_TEMPLATES.invoiceSent,
      to: customerEmail,
      toName: customerName,
      variables: {
        customer_name: customerName,
        invoice_number: invoiceDetails.invoiceNumber,
        total_amount: invoiceDetails.totalAmount,
        due_date: invoiceDetails.dueDate,
        invoice_url: invoiceDetails.invoiceUrl || tenantUrls.dashboardUrl
      }
    });
  }

  /**
   * Sends quote email
   */
  async sendQuoteEmail(
    customerEmail: string,
    customerName: string,
    quoteDetails: {
      quoteNumber: string;
      totalAmount: string;
      validUntil: string;
      quoteUrl?: string;
    }
  ): Promise<any> {
    const tenantUrls = await generateTenantEmailUrls(this.tenantId);
    
    return this.sendTemplateEmail({
      templateId: 'quote-notification',
      to: customerEmail,
      toName: customerName,
      variables: {
        customer_name: customerName,
        quote_number: quoteDetails.quoteNumber,
        total_amount: quoteDetails.totalAmount,
        valid_until: quoteDetails.validUntil,
        quote_url: quoteDetails.quoteUrl || tenantUrls.dashboardUrl
      }
    });
  }

  /**
   * Sends bulk emails (for notifications, reminders, etc.)
   */
  async sendBulkEmails(
    recipients: Array<{ email: string; name?: string; variables?: Record<string, any> }>,
    templateId: string,
    commonVariables: Record<string, any> = {}
  ): Promise<Array<{ email: string; success: boolean; error?: string }>> {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        await this.sendTemplateEmail({
          templateId,
          to: recipient.email,
          toName: recipient.name,
          variables: {
            ...commonVariables,
            ...recipient.variables
          }
        });
        results.push({ email: recipient.email, success: true });
      } catch (error) {
        results.push({ 
          email: recipient.email, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
}

/**
 * Factory function to create EmailService instance
 */
export const createEmailService = (tenantId: string, showToasts: boolean = true): EmailService => {
  return new EmailService(tenantId, showToasts);
};

/**
 * Hook-style wrapper for React components
 */
export const useUnifiedEmailService = (tenantId?: string, showToasts: boolean = true) => {
  if (!tenantId) {
    throw new Error('Tenant ID is required for email service');
  }
  
  return createEmailService(tenantId, showToasts);
};