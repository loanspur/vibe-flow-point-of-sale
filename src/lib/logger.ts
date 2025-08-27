export interface LogContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  email?: string;
  templateId?: string;
  driver?: string;
  [key: string]: any;
}

export class Logger {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static info(message: string, context: LogContext = {}): void {
    const logEntry = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      requestId: context.requestId || this.generateRequestId(),
      ...context
    };

    console.log('📝', JSON.stringify(logEntry, null, 2));
  }

  static warn(message: string, context: LogContext = {}): void {
    const logEntry = {
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      requestId: context.requestId || this.generateRequestId(),
      ...context
    };

    console.warn('⚠️', JSON.stringify(logEntry, null, 2));
  }

  static error(message: string, error?: any, context: LogContext = {}): void {
    const logEntry = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      requestId: context.requestId || this.generateRequestId(),
      error: error ? {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      } : undefined,
      ...context
    };

    console.error('❌', JSON.stringify(logEntry, null, 2));
  }

  static emailSuccess(emailId: string, recipient: string, driver: string, context: LogContext = {}): void {
    this.info('Email sent successfully', {
      emailId,
      recipient,
      driver,
      ...context
    });
  }

  static emailError(error: any, recipient: string, driver: string, context: LogContext = {}): void {
    this.error('Email sending failed', error, {
      recipient,
      driver,
      ...context
    });
  }

  static inviteStarted(email: string, role: string, tenantId: string, context: LogContext = {}): void {
    this.info('User invitation started', {
      email,
      role,
      tenantId,
      ...context
    });
  }

  static inviteSuccess(userId: string, email: string, emailId: string, context: LogContext = {}): void {
    this.info('User invitation completed successfully', {
      userId,
      email,
      emailId,
      ...context
    });
  }

  static inviteError(error: any, email: string, context: LogContext = {}): void {
    this.error('User invitation failed', error, {
      email,
      ...context
    });
  }
}
