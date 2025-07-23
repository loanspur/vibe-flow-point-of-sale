import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface EmailOptions {
  templateId?: string;
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
}

export const useEmailService = () => {
  const { tenantId } = useAuth();

  const sendEmail = async (options: EmailOptions) => {
    try {
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      const response = await supabase.functions.invoke('send-enhanced-email', {
        body: {
          ...options,
          tenantId,
          scheduledFor: options.scheduledFor?.toISOString()
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Email sent successfully",
      });

      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendTemplateEmail = async (
    templateId: string,
    to: string,
    variables: Record<string, any>,
    options?: Partial<EmailOptions>
  ) => {
    try {
      // First get the template
      const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      if (!template) throw new Error('Template not found');

      // Process template variables
      let processedHtml = template.html_content;
      let processedSubject = template.subject;
      let processedText = template.text_content || '';

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), String(value));
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value));
        processedText = processedText.replace(new RegExp(placeholder, 'g'), String(value));
      }

      return await sendEmail({
        templateId,
        to,
        subject: processedSubject,
        htmlContent: processedHtml,
        textContent: processedText,
        variables,
        ...options
      });
    } catch (error) {
      console.error('Error sending template email:', error);
      throw error;
    }
  };

  const sendWelcomeEmail = async (userEmail: string, userName: string, companyName: string) => {
    return await sendTemplateEmail(
      'welcome', // This would be the template name/ID
      userEmail,
      {
        user_name: userName,
        company_name: companyName,
        login_url: `${window.location.origin}/auth`
      }
    );
  };

  const sendPasswordResetEmail = async (userEmail: string, userName: string, resetUrl: string) => {
    return await sendTemplateEmail(
      'password_reset',
      userEmail,
      {
        user_name: userName,
        company_name: 'VibePOS',
        reset_url: resetUrl
      }
    );
  };

  const sendOrderConfirmationEmail = async (
    customerEmail: string,
    customerName: string,
    orderDetails: {
      orderNumber: string;
      totalAmount: string;
      orderDate: string;
      orderUrl: string;
    }
  ) => {
    return await sendTemplateEmail(
      'order_confirmation',
      customerEmail,
      {
        customer_name: customerName,
        order_number: orderDetails.orderNumber,
        total_amount: orderDetails.totalAmount,
        order_date: orderDetails.orderDate,
        order_url: orderDetails.orderUrl
      }
    );
  };

  return {
    sendEmail,
    sendTemplateEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail
  };
};