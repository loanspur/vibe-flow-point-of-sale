/**
 * Shared constants for Supabase Edge Functions
 * Centralizes hardcoded values to improve maintainability
 */

export const DOMAIN_CONFIG = {
  // Production domains
  PRODUCTION: {
    PRIMARY: 'vibenet.shop',
    FALLBACK: 'vibenet.online'
  },
  
  // Development domains
  DEVELOPMENT: {
    LOCALHOST: 'localhost:5173',
    LOCAL: '127.0.0.1:5173'
  },
  
  // Protocol configurations
  PROTOCOLS: {
    HTTPS: 'https://',
    HTTP: 'http://'
  }
} as const;

export const EMAIL_CONFIG = {
  // Email templates
  TEMPLATES: {
    WELCOME: 'welcome',
    INVITATION: 'invitation',
    PASSWORD_RESET: 'password-reset',
    QUOTE_REMINDER: 'quote-reminder',
    INVOICE_REMINDER: 'invoice-reminder'
  },
  
  // Email subjects
  SUBJECTS: {
    WELCOME: 'Welcome to VibePOS - Your Business Management System',
    INVITATION: 'You\'re invited to join VibePOS',
    PASSWORD_RESET: 'Reset your VibePOS password',
    QUOTE_REMINDER: 'Quote Reminder - Action Required',
    INVOICE_REMINDER: 'Invoice Reminder - Payment Due'
  },
  
  // Sender information
  SENDER: {
    NAME: 'VibePOS Team',
    EMAIL: 'noreply@vibepos.com'
  }
} as const;

export const API_CONFIG = {
  // CORS headers
  CORS_HEADERS: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  },
  
  // Response headers
  RESPONSE_HEADERS: {
    'Content-Type': 'application/json'
  }
} as const;

export const BUSINESS_CONFIG = {
  // Business information
  COMPANY: {
    NAME: 'VibePOS',
    DESCRIPTION: 'Modern Point of Sale System',
    WEBSITE: 'https://vibepos.com',
    SUPPORT_EMAIL: 'support@vibepos.com'
  },
  
  // Default settings
  DEFAULTS: {
    CURRENCY: 'KES',
    TIMEZONE: 'Africa/Nairobi',
    DATE_FORMAT: 'DD/MM/YYYY',
    LANGUAGE: 'en'
  }
} as const;

export const SYSTEM_CONFIG = {
  // Timeouts and limits
  TIMEOUTS: {
    REQUEST: 30000, // 30 seconds
    EMAIL_SEND: 10000, // 10 seconds
    DATABASE_QUERY: 15000 // 15 seconds
  },
  
  // Retry configurations
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000
  },
  
  // Rate limiting
  RATE_LIMITS: {
    EMAIL_PER_MINUTE: 60,
    REQUESTS_PER_MINUTE: 100
  }
} as const;

// Helper functions
export const domainHelpers = {
  /**
   * Get the appropriate domain based on environment
   */
  getDomain: (): string => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    
    if (supabaseUrl.includes('vibenet.shop')) {
      return DOMAIN_CONFIG.PRODUCTION.PRIMARY;
    }
    
    if (supabaseUrl.includes('vibenet.online')) {
      return DOMAIN_CONFIG.PRODUCTION.FALLBACK;
    }
    
    // Default to primary domain
    return DOMAIN_CONFIG.PRODUCTION.PRIMARY;
  },
  
  /**
   * Build a complete URL with subdomain
   */
  buildUrl: (subdomain: string, path = ''): string => {
    const domain = domainHelpers.getDomain();
    const protocol = DOMAIN_CONFIG.PROTOCOLS.HTTPS;
    return `${protocol}${subdomain}.${domain}${path}`;
  },
  
  /**
   * Check if URL is localhost/development
   */
  isDevelopment: (url: string): boolean => {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
};

export const emailHelpers = {
  /**
   * Get email subject by template type
   */
  getSubject: (template: keyof typeof EMAIL_CONFIG.SUBJECTS): string => {
    return EMAIL_CONFIG.SUBJECTS[template];
  },
  
  /**
   * Build sender information
   */
  getSender: (name?: string) => {
    return {
      name: name || EMAIL_CONFIG.SENDER.NAME,
      email: EMAIL_CONFIG.SENDER.EMAIL
    };
  }
};

export const responseHelpers = {
  /**
   * Create a success response
   */
  success: (data: any, status = 200): Response => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: {
        ...API_CONFIG.CORS_HEADERS,
        ...API_CONFIG.RESPONSE_HEADERS
      }
    });
  },
  
  /**
   * Create an error response
   */
  error: (message: string, status = 400, details?: any): Response => {
    return new Response(JSON.stringify({ 
      success: false, 
      error: message, 
      details 
    }), {
      status,
      headers: {
        ...API_CONFIG.CORS_HEADERS,
        ...API_CONFIG.RESPONSE_HEADERS
      }
    });
  },
  
  /**
   * Create a CORS preflight response
   */
  cors: (): Response => {
    return new Response(null, { 
      status: 200, 
      headers: API_CONFIG.CORS_HEADERS 
    });
  }
};
