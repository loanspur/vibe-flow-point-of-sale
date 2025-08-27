export interface MailerResult {
  success: boolean;
  emailId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface InviteEmailParams {
  email: string;
  fullName: string;
  role: string;
  tenantName: string;
  verificationUrl: string;
  invitationBaseUrl: string;
  isReinvite?: boolean;
}

export interface Mailer {
  sendInvite(params: InviteEmailParams): Promise<MailerResult>;
}

export type EmailDriver = 'RESEND' | 'CONSOLE' | 'SUPABASE';
