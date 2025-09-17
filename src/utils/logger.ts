/**
 * Centralized logging utility to replace console statements
 * Provides consistent logging across the application with proper levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  component?: string;
}

class Logger {
  private config: LogConfig;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: process.env.NODE_ENV === 'development',
      enableRemote: false,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const component = this.config.component ? `[${this.config.component}]` : '';
    return `${timestamp} ${level} ${component} ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(levelName, message, data);
    
    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, data || '');
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, data || '');
          break;
      }
    }

    // TODO: Add remote logging if needed
    if (this.config.enableRemote) {
      // Send to remote logging service
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  // Component-specific logger
  forComponent(component: string): Logger {
    return new Logger({ ...this.config, component });
  }

  // Update configuration
  updateConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Default logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: process.env.NODE_ENV === 'development'
});

// Component-specific loggers
export const createComponentLogger = (component: string): Logger => {
  return logger.forComponent(component);
};

// Common logging patterns
export const loggers = {
  sale: createComponentLogger('SaleForm'),
  payment: createComponentLogger('PaymentProcessor'),
  inventory: createComponentLogger('InventoryManager'),
  customer: createComponentLogger('CustomerManager'),
  product: createComponentLogger('ProductManager'),
  auth: createComponentLogger('AuthContext'),
  api: createComponentLogger('APIClient'),
  ui: createComponentLogger('UIComponent')
};

// Performance logging
export const performanceLogger = {
  start: (operation: string): number => {
    const start = performance.now();
    logger.debug(`Starting operation: ${operation}`);
    return start;
  },

  end: (operation: string, startTime: number): void => {
    const duration = performance.now() - startTime;
    logger.info(`Completed operation: ${operation} in ${duration.toFixed(2)}ms`);
  },

  measure: async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
    const start = performanceLogger.start(operation);
    try {
      const result = await fn();
      performanceLogger.end(operation, start);
      return result;
    } catch (error) {
      performanceLogger.end(operation, start);
      throw error;
    }
  }
};

// Error logging with context
export const errorLogger = {
  logError: (error: Error, context?: any): void => {
    logger.error(`Error occurred: ${error.message}`, {
      stack: error.stack,
      context
    });
  },

  logApiError: (endpoint: string, error: any, requestData?: any): void => {
    logger.error(`API Error on ${endpoint}`, {
      error: error.message || error,
      requestData,
      status: error.status,
      statusText: error.statusText
    });
  },

  logValidationError: (field: string, value: any, rule: string): void => {
    logger.warn(`Validation error for ${field}`, {
      value,
      rule,
      message: `Invalid ${field}: ${rule}`
    });
  }
};

export default logger;
