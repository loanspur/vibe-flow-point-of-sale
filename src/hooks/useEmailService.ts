import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedEmailService, BaseEmailOptions, TemplateEmailOptions } from '@/lib/emailService';

// Legacy interface for backward compatibility
export interface EmailOptions extends BaseEmailOptions {
  templateId?: string;
}

/**
 * Legacy hook that wraps the new unified email service
 * @deprecated Use useUnifiedEmailService directly for new code
 */
export const useEmailService = () => {
  const { tenantId } = useAuth();
  const emailService = useUnifiedEmailService(tenantId);

  // Wrapper functions for backward compatibility
  const sendEmail = async (options: EmailOptions) => {
    return emailService.sendEmail(options);
  };

  const sendTemplateEmail = async (
    templateId: string,
    to: string,
    variables: Record<string, any>,
    options?: Partial<EmailOptions>
  ) => {
    return emailService.sendTemplateEmail({
      templateId,
      to,
      variables,
      toName: options?.toName,
      priority: options?.priority,
      scheduledFor: options?.scheduledFor,
      subjectOverride: options?.subject
    });
  };

  const sendWelcomeEmail = async (userEmail: string, userName: string, companyName: string) => {
    return emailService.sendWelcomeEmail(userEmail, userName, companyName);
  };

  const sendPasswordResetEmail = async (userEmail: string, userName: string, resetUrl: string) => {
    return emailService.sendPasswordResetEmail(userEmail, userName, resetUrl);
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
    return emailService.sendOrderConfirmationEmail(customerEmail, customerName, orderDetails);
  };

  return {
    sendEmail,
    sendTemplateEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendInvoiceNotificationEmail: emailService.sendInvoiceNotificationEmail.bind(emailService),
    sendQuoteEmail: emailService.sendQuoteEmail.bind(emailService)
  };
};