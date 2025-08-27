import { Mailer, EmailDriver } from './types';
import { ResendMailer } from './resend-mailer';
import { ConsoleMailer } from './console-mailer';

export class MailerFactory {
  static createMailer(): Mailer {
    const driver = this.getEmailDriver();
    
    try {
      switch (driver) {
        case 'RESEND':
          return new ResendMailer();
        case 'CONSOLE':
          return new ConsoleMailer();
        case 'SUPABASE':
          // TODO: Implement Supabase mailer if needed
          console.warn('Supabase mailer not implemented, falling back to console');
          return new ConsoleMailer();
        default:
          console.warn(`Unknown email driver: ${driver}, falling back to console`);
          return new ConsoleMailer();
      }
    } catch (error) {
      console.error('Failed to create mailer:', error);
      console.warn('Falling back to console mailer');
      return new ConsoleMailer();
    }
  }

  private static getEmailDriver(): EmailDriver {
    // Check environment variable first
    const envDriver = import.meta.env.VITE_EMAIL_DRIVER as EmailDriver;
    if (envDriver && ['RESEND', 'CONSOLE', 'SUPABASE'].includes(envDriver)) {
      return envDriver;
    }

    // Fallback based on NODE_ENV
    const nodeEnv = import.meta.env.MODE || 'development';
    if (nodeEnv === 'production') {
      return 'RESEND';
    } else {
      return 'CONSOLE';
    }
  }

  static validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const driver = this.getEmailDriver();

    if (driver === 'RESEND') {
      const apiKey = import.meta.env.VITE_RESEND_API_KEY;
      const fromEmail = import.meta.env.VITE_RESEND_FROM;

      if (!apiKey) {
        errors.push('RESEND_API_KEY environment variable is required for Resend mailer');
      }

      if (!fromEmail) {
        errors.push('RESEND_FROM environment variable is required for Resend mailer');
      } else if (!fromEmail.includes('@')) {
        errors.push('RESEND_FROM must be a valid email address');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
