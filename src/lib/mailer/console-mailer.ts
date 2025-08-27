import { Mailer, MailerResult, InviteEmailParams } from './types';

export class ConsoleMailer implements Mailer {
  async sendInvite(params: InviteEmailParams): Promise<MailerResult> {
    const { email, fullName, role, tenantName, verificationUrl, invitationBaseUrl, isReinvite } = params;

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

    // Log the email payload to console
    console.group('📧 CONSOLE MAILER - Invite Email');
    console.log('To:', email);
    console.log('Subject:', emailSubject);
    console.log('Verification URL:', verificationUrl);
    console.log('Invitation Base URL:', invitationBaseUrl);
    console.log('Is Reinvite:', isReinvite);
    console.log('HTML Content:', htmlContent);
    console.groupEnd();

    // Simulate a small delay to mimic real email sending
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      emailId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
}
