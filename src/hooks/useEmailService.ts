import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { domainRouter } from '@/lib/domain-router';

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
    try {
      // Get tenant's domain configuration for proper redirect URL
      const domainConfig = await domainRouter.getCurrentDomainConfig();
      let tenantLoginUrl = `${window.location.origin}/auth`;
      
      if (tenantId && domainConfig?.tenantId === tenantId) {
        // Use current domain if we're on a tenant domain
        tenantLoginUrl = `${window.location.origin}/auth`;
      } else if (tenantId) {
        // Generate tenant-specific subdomain URL
        const { data: tenantDomain } = await supabase
          .from('tenant_domains')
          .select('domain_name, domain_type')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false })
          .limit(1)
          .single();
        
        if (tenantDomain) {
          if (tenantDomain.domain_type === 'custom_domain') {
            tenantLoginUrl = `https://${tenantDomain.domain_name}/auth`;
          } else if (tenantDomain.domain_type === 'subdomain') {
            tenantLoginUrl = `https://${tenantDomain.domain_name}/auth`;
          }
        }
      }

      return await sendTemplateEmail(
        'welcome', // This would be the template name/ID
        userEmail,
        {
          user_name: userName,
          company_name: companyName,
          login_url: tenantLoginUrl,
          tenant_id: tenantId,
          dashboard_url: tenantLoginUrl.replace('/auth', '/admin')
        }
      );
    } catch (error) {
      console.error('Error generating tenant URL for welcome email:', error);
      // Fallback to current origin
      return await sendTemplateEmail(
        'welcome',
        userEmail,
        {
          user_name: userName,
          company_name: companyName,
          login_url: `${window.location.origin}/auth`,
          tenant_id: tenantId,
          dashboard_url: `${window.location.origin}/admin`
        }
      );
    }
  };

  const sendPasswordResetEmail = async (userEmail: string, userName: string, resetUrl: string) => {
    try {
      // Ensure reset URL points to the correct tenant domain
      const domainConfig = await domainRouter.getCurrentDomainConfig();
      let tenantResetUrl = resetUrl;
      
      if (tenantId && domainConfig?.tenantId === tenantId) {
        // Already on correct domain
        tenantResetUrl = resetUrl;
      } else if (tenantId) {
        // Generate tenant-specific reset URL
        const { data: tenantDomain } = await supabase
          .from('tenant_domains')
          .select('domain_name, domain_type')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false })
          .limit(1)
          .single();
        
        if (tenantDomain) {
          const baseUrl = tenantDomain.domain_type === 'custom_domain' 
            ? `https://${tenantDomain.domain_name}`
            : `https://${tenantDomain.domain_name}`;
          
          // Extract token and type from reset URL
          const url = new URL(resetUrl);
          const token = url.searchParams.get('token');
          const type = url.searchParams.get('type');
          
          if (token && type) {
            tenantResetUrl = `${baseUrl}/reset-password?token=${token}&type=${type}`;
          }
        }
      }

      return await sendTemplateEmail(
        'password_reset',
        userEmail,
        {
          user_name: userName,
          company_name: 'VibePOS',
          reset_url: tenantResetUrl,
          tenant_id: tenantId
        }
      );
    } catch (error) {
      console.error('Error generating tenant reset URL:', error);
      // Fallback to original URL
      return await sendTemplateEmail(
        'password_reset',
        userEmail,
        {
          user_name: userName,
          company_name: 'VibePOS',
          reset_url: resetUrl,
          tenant_id: tenantId
        }
      );
    }
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