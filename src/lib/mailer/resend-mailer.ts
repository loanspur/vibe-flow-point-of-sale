import { Resend } from 'resend';
import { Mailer, MailerResult, InviteEmailParams } from './types';

export class ResendMailer implements Mailer {
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    const apiKey = import.meta.env.VITE_RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = import.meta.env.VITE_RESEND_FROM || 'noreply@vibenet.shop';
    this.fromName = import.meta.env.VITE_RESEND_FROM_NAME || 'VibePOS Team';

    // Validate from email
    if (!this.fromEmail.includes('@')) {
      throw new Error('RESEND_FROM must be a valid email address');
    }
  }

  async sendInvite(params: InviteEmailParams): Promise<MailerResult> {
    const { email, fullName, role, tenantName, verificationUrl, invitationBaseUrl, isReinvite } = params;

    // Validate email format
    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
          details: { email }
        }
      };
    }

    const emailSubject = isReinvite 
      ? `You've been re-invited to join ${tenantName} on VibePOS` 
      : `You're invited to join ${tenantName} on VibePOS`;

    const htmlContent = this.generateInviteEmailHTML({
      fullName,
      role,
      tenantName,
      verificationUrl,
      invitationBaseUrl,
      isReinvite
    });

    // Retry logic with exponential backoff
    const maxRetries = 3;
    const baseDelay = 200;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const emailResponse = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [email],
          subject: emailSubject,
          html: htmlContent,
        });

        // Check for Resend errors
        if (emailResponse.error) {
          const error = emailResponse.error as any;
          const isTransientError = this.isTransientError(error);
          
          if (isTransientError && attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`Resend attempt ${attempt} failed, retrying in ${delay}ms:`, error);
            await this.sleep(delay);
            continue;
          }

          return {
            success: false,
            error: {
              code: error.code || 'RESEND_ERROR',
              message: `Resend: ${error.statusCode || 'Unknown'} – ${error.message || 'Email sending failed'}`,
              details: error
            }
          };
        }

        // Success
        return {
          success: true,
          emailId: emailResponse.data?.id
        };

      } catch (error: any) {
        const isTransientError = this.isTransientError(error);
        
        if (isTransientError && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`Resend attempt ${attempt} failed, retrying in ${delay}ms:`, error);
          await this.sleep(delay);
          continue;
        }

        return {
          success: false,
          error: {
            code: 'RESEND_EXCEPTION',
            message: `Resend exception: ${error.message || 'Unknown error'}`,
            details: error
          }
        };
      }
    }

    return {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: 'Maximum retry attempts exceeded',
        details: { maxRetries }
      }
    };
  }

  private generateInviteEmailHTML(params: {
    fullName: string;
    role: string;
    tenantName: string;
    verificationUrl: string;
    invitationBaseUrl: string;
    isReinvite?: boolean;
  }): string {
    const { fullName, role, tenantName, verificationUrl, invitationBaseUrl, isReinvite } = params;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">You're Invited to VibePOS!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin-top: 0;">Hello ${fullName},</h2>
          <p style="color: #475569; line-height: 1.6;">
            You've been invited to join <strong>${tenantName}</strong> on VibePOS as a <strong>${role}</strong>. 
            VibePOS is a powerful point-of-sale system that will help you manage business operations efficiently.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b;">What's Next?</h3>
          <ol style="color: #475569; line-height: 1.6;">
            <li>Click the button below to verify your email and set your password</li>
            <li>Confirm your new password on the secure page</li>
            <li>Start exploring your VibePOS dashboard</li>
            <li>Get familiar with the features available for your role</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Accept Invitation & Set Password
          </a>
        </div>

        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #075985;">
            <strong>Set your password (tenant link):</strong><br>
            <a href="${verificationUrl}" style="color: #0369a1; word-break: break-all;">${invitationBaseUrl}/reset-password</a>
          </p>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e;">
            <strong>⚠️ Security Note:</strong> This invitation link is secure and can only be used once. 
            It will expire in 24 hours for your security.
          </p>
        </div>

        <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #1e40af;">
            <strong>Need help?</strong> Contact your system administrator at ${tenantName} or our support team for assistance.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; margin: 0;">
            Best regards,<br>
            The VibePOS Team
          </p>
        </div>
      </div>
    `;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isTransientError(error: any): boolean {
    const statusCode = error.statusCode || error.status || error.code;
    const message = (error.message || '').toLowerCase();
    
    // Retry on rate limits and server errors
    return statusCode === 429 || 
           (statusCode >= 500 && statusCode < 600) ||
           message.includes('rate limit') ||
           message.includes('timeout') ||
           message.includes('network');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
