import { useAuth } from '@/contexts/AuthContext';
import { 
  useUnifiedCommunicationService, 
  CommunicationOptions, 
  CommunicationResult,
  CommunicationChannel 
} from '@/lib/unifiedCommunicationService';

/**
 * Unified communication hook that replaces all separate communication hooks
 * Provides a single interface for email, SMS, and WhatsApp communications
 */
export const useUnifiedCommunication = () => {
  let tenantId: string | null = null;
  let user: any = null;
  
  try {
    const authContext = useAuth();
    tenantId = authContext.tenantId;
    user = authContext.user;
  } catch (error) {
    // If context is not available (e.g., called outside provider), use fallback
    console.warn('Auth context not available in useUnifiedCommunication, using fallback');
  }
  
  // Determine user role for service configuration
  const getUserRole = (): 'superadmin' | 'tenant_admin' | 'user' => {
    if (!user) return 'user';
    
    // Check if user has superadmin role
    if (user.user_metadata?.role === 'superadmin') return 'superadmin';
    
    // Check if user is tenant admin (you may need to adjust this logic based on your auth system)
    if (user.user_metadata?.role === 'admin' || user.user_metadata?.is_admin) return 'tenant_admin';
    
    return 'user';
  };

  const userRole = getUserRole();
  const communicationService = useUnifiedCommunicationService(tenantId, userRole);

  /**
   * Send communication through any channel
   */
  const sendCommunication = async (options: CommunicationOptions): Promise<CommunicationResult> => {
    return await communicationService.sendCommunication({ ...options, tenantId: options.tenantId || tenantId });
  };

  /**
   * Send bulk communications
   */
  const sendBulkCommunication = async (
    recipients: Array<{ recipient: string; recipientName?: string; variables?: Record<string, any> }>,
    channel: CommunicationChannel,
    templateId: string,
    commonVariables: Record<string, any> = {}
  ): Promise<Array<CommunicationResult>> => {
    return await communicationService.sendBulkCommunication(recipients, channel, templateId, commonVariables);
  };

  /**
   * Send email using unified service
   */
  const sendEmail = async (
    recipient: string,
    subject: string,
    htmlContent: string,
    options?: {
      recipientName?: string;
      textContent?: string;
      templateId?: string;
      variables?: Record<string, any>;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduledFor?: Date;
    }
  ): Promise<CommunicationResult> => {
    return await sendCommunication({
      channel: 'email',
      recipient,
      recipientName: options?.recipientName,
      subject,
      htmlContent,
      textContent: options?.textContent,
      templateId: options?.templateId,
      variables: options?.variables,
      priority: options?.priority,
      scheduledFor: options?.scheduledFor
    });
  };

  /**
   * Send template email
   */
  const sendTemplateEmail = async (
    templateId: string,
    recipient: string,
    variables?: Record<string, any>,
    options?: {
      recipientName?: string;
      subjectOverride?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduledFor?: Date;
    }
  ): Promise<CommunicationResult> => {
    return await sendCommunication({
      channel: 'email',
      recipient,
      recipientName: options?.recipientName,
      subject: options?.subjectOverride,
      templateId,
      variables,
      priority: options?.priority,
      scheduledFor: options?.scheduledFor
    });
  };

  /**
   * Send WhatsApp message
   */
  const sendWhatsApp = async (
    recipient: string,
    message: string,
    options?: {
      recipientName?: string;
      templateId?: string;
      variables?: Record<string, any>;
      useGlobal?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ): Promise<CommunicationResult> => {
    return await sendCommunication({
      channel: 'whatsapp',
      recipient,
      recipientName: options?.recipientName,
      message,
      templateId: options?.templateId,
      variables: options?.variables,
      useGlobal: options?.useGlobal,
      priority: options?.priority
    });
  };

  /**
   * Send template WhatsApp message
   */
  const sendTemplateWhatsApp = async (
    templateId: string,
    recipient: string,
    variables?: Record<string, any>,
    options?: {
      recipientName?: string;
      useGlobal?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ): Promise<CommunicationResult> => {
    return await sendCommunication({
      channel: 'whatsapp',
      recipient,
      recipientName: options?.recipientName,
      templateId,
      variables,
      useGlobal: options?.useGlobal,
      priority: options?.priority
    });
  };

  /**
   * Send SMS message
   */
  const sendSMS = async (
    recipient: string,
    message: string,
    options?: {
      recipientName?: string;
      templateId?: string;
      variables?: Record<string, any>;
      sender?: string;
      useGlobal?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ): Promise<CommunicationResult> => {
    return await sendCommunication({
      channel: 'sms',
      recipient,
      recipientName: options?.recipientName,
      message,
      templateId: options?.templateId,
      variables: options?.variables,
      useGlobal: options?.useGlobal,
      priority: options?.priority
    });
  };

  /**
   * Business logic integration methods
   */

  // Send receipt notification (replaces whatsappAutomation.ts receipt function)
  const sendReceiptNotification = async (
    saleId: string,
    saleData: any,
    customerPhone?: string,
    customerEmail?: string
  ): Promise<CommunicationResult[]> => {
    return await communicationService.sendReceiptNotification(saleData, customerPhone, customerEmail);
  };

  // Send invoice notification
  const sendInvoiceNotification = async (
    invoiceId: string,
    invoiceData: any,
    customerPhone?: string,
    customerEmail?: string
  ): Promise<CommunicationResult[]> => {
    return await communicationService.sendInvoiceNotification(invoiceData, customerPhone, customerEmail);
  };

  // Send quote notification
  const sendQuoteNotification = async (
    quoteId: string,
    quoteData: any,
    customerPhone?: string,
    customerEmail?: string
  ): Promise<CommunicationResult[]> => {
    return await communicationService.sendQuoteNotification(quoteData, customerPhone, customerEmail);
  };

  // Send low stock alert
  const sendLowStockAlert = async (
    productName: string,
    currentStock: number,
    minStock: number
  ): Promise<CommunicationResult[]> => {
    return await communicationService.sendLowStockAlert(productName, currentStock, minStock);
  };

  // Send payment received notification
  const sendPaymentReceivedNotification = async (
    paymentId: string,
    paymentData: any,
    customerPhone?: string,
    customerEmail?: string
  ): Promise<CommunicationResult[]> => {
    return await communicationService.sendPaymentReceivedNotification(paymentData, customerPhone, customerEmail);
  };

  /**
   * Legacy method compatibility (for existing integrations)
   */

  // For backward compatibility with existing WhatsApp service
  const sendReceiptWhatsApp = async (receipt: any, recipient_phone: string): Promise<CommunicationResult> => {
    const results = await sendReceiptNotification(receipt.id, receipt, recipient_phone);
    return results.find(r => r.channel === 'whatsapp') || results[0];
  };

  const sendInvoiceWhatsApp = async (invoice: any, recipient_phone: string): Promise<CommunicationResult> => {
    const results = await sendInvoiceNotification(invoice.id, invoice, recipient_phone);
    return results.find(r => r.channel === 'whatsapp') || results[0];
  };

  const sendQuoteWhatsApp = async (quote: any, recipient_phone: string): Promise<CommunicationResult> => {
    const results = await sendQuoteNotification(quote.id, quote, recipient_phone);
    return results.find(r => r.channel === 'whatsapp') || results[0];
  };

  // For backward compatibility with existing email service
  const sendWelcomeEmail = async (userEmail: string, userName: string, companyName?: string): Promise<CommunicationResult> => {
    return await sendTemplateEmail('welcome', userEmail, {
      user_name: userName,
      company_name: companyName || 'Your Company'
    }, { recipientName: userName });
  };

  const sendPasswordResetEmail = async (userEmail: string, userName: string, resetUrl: string): Promise<CommunicationResult> => {
    return await sendTemplateEmail('password_reset', userEmail, {
      user_name: userName,
      reset_url: resetUrl
    }, { recipientName: userName });
  };

  const sendOrderConfirmationEmail = async (
    customerEmail: string,
    customerName: string,
    orderDetails: {
      orderNumber: string;
      totalAmount: string;
      orderDate: string;
      orderUrl?: string;
    }
  ): Promise<CommunicationResult> => {
    return await sendTemplateEmail('order_confirmation', customerEmail, {
      customer_name: customerName,
      order_number: orderDetails.orderNumber,
      total_amount: orderDetails.totalAmount,
      order_date: orderDetails.orderDate,
      order_url: orderDetails.orderUrl
    }, { recipientName: customerName });
  };

  return {
    // Core unified methods
    sendCommunication,
    sendBulkCommunication,
    
    // Channel-specific methods
    sendEmail,
    sendTemplateEmail,
    sendWhatsApp,
    sendTemplateWhatsApp,
    sendSMS,
    
    // Business logic methods
    sendReceiptNotification,
    sendInvoiceNotification,
    sendQuoteNotification,
    sendLowStockAlert,
    sendPaymentReceivedNotification,
    
    // Legacy compatibility methods
    sendReceiptWhatsApp,
    sendInvoiceWhatsApp,
    sendQuoteWhatsApp,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    
    // Utility
    userRole,
    tenantId
  };
};