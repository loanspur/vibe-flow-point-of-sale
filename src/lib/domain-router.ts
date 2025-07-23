import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DomainRouterConfig {
  tenantId: string | null;
  domain: string;
  isCustomDomain: boolean;
  isSubdomain: boolean;
}

class DomainRouter {
  private cache = new Map<string, { tenantId: string; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeRouting();
  }

  private initializeRouting() {
    // Initialize routing based on current domain
    const currentDomain = window.location.hostname;
    this.setCurrentDomain(currentDomain);
  }

  private setCurrentDomain(domain: string) {
    // Store current domain info in sessionStorage for quick access
    const domainInfo = this.parseDomain(domain);
    sessionStorage.setItem('current-domain-info', JSON.stringify(domainInfo));
  }

  private parseDomain(domain: string): DomainRouterConfig {
    // Check if it's a development domain
    if (domain === 'localhost' || domain.endsWith('.lovableproject.com')) {
      return {
        tenantId: null,
        domain,
        isCustomDomain: false,
        isSubdomain: false
      };
    }

    // Check if it's a subdomain of your main app
    if (domain.endsWith('.vibepos.app') || domain.endsWith('.yourapp.com')) {
      const subdomain = domain.split('.')[0];
      return {
        tenantId: null, // Will be resolved later
        domain,
        isCustomDomain: false,
        isSubdomain: true
      };
    }

    // It's a custom domain
    return {
      tenantId: null, // Will be resolved later
      domain,
      isCustomDomain: true,
      isSubdomain: false
    };
  }

  async getCurrentDomainConfig(): Promise<DomainRouterConfig> {
    const currentDomain = window.location.hostname;
    
    // Try to get from cache first
    const cached = this.cache.get(currentDomain);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return {
        tenantId: cached.tenantId,
        domain: currentDomain,
        isCustomDomain: !currentDomain.endsWith('.vibepos.app') && !currentDomain.endsWith('.yourapp.com'),
        isSubdomain: currentDomain.endsWith('.vibepos.app') || currentDomain.endsWith('.yourapp.com')
      };
    }

    // Get domain info from parsed data
    const domainInfo = this.parseDomain(currentDomain);

    // If it's a development domain, return as is
    if (currentDomain === 'localhost' || currentDomain.endsWith('.lovableproject.com')) {
      return domainInfo;
    }

    try {
      // Try to resolve tenant ID from database
      const { data: tenantId, error } = await supabase
        .rpc('get_tenant_by_domain', { domain_name_param: currentDomain });

      if (error) {
        console.error('Error resolving tenant by domain:', error);
        return domainInfo;
      }

      const resolvedConfig: DomainRouterConfig = {
        ...domainInfo,
        tenantId: tenantId || null
      };

      // Cache the result
      if (tenantId) {
        this.cache.set(currentDomain, {
          tenantId,
          timestamp: Date.now()
        });
      }

      return resolvedConfig;
    } catch (error) {
      console.error('Error in getCurrentDomainConfig:', error);
      return domainInfo;
    }
  }

  async resolveTenantFromDomain(domain?: string): Promise<string | null> {
    const targetDomain = domain || window.location.hostname;
    
    // Check cache first
    const cached = this.cache.get(targetDomain);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.tenantId;
    }

    try {
      const { data: tenantId, error } = await supabase
        .rpc('get_tenant_by_domain', { domain_name_param: targetDomain });

      if (error) {
        console.error('Error resolving tenant:', error);
        return null;
      }

      // Cache the result
      if (tenantId) {
        this.cache.set(targetDomain, {
          tenantId,
          timestamp: Date.now()
        });
      }

      return tenantId;
    } catch (error) {
      console.error('Error resolving tenant from domain:', error);
      return null;
    }
  }

  generateTenantUrl(tenantId: string, subdomain?: string, customDomain?: string): string {
    if (customDomain) {
      return `https://${customDomain}`;
    }
    
    if (subdomain) {
      return `https://${subdomain}.vibepos.app`;
    }

    // Fallback to tenant ID based subdomain
    return `https://tenant-${tenantId}.vibepos.app`;
  }

  generateSubdomainFromTenantName(tenantName: string): string {
    // Convert tenant name to valid subdomain
    return tenantName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63); // DNS subdomain limit
  }

  validateSubdomain(subdomain: string): boolean {
    const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    return subdomainRegex.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 63;
  }

  validateCustomDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])*(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])*)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  clearCache(domain?: string) {
    if (domain) {
      this.cache.delete(domain);
    } else {
      this.cache.clear();
    }
  }

  // Handle domain-specific redirects
  async handleDomainBasedNavigation(path: string = '/'): Promise<string> {
    const config = await this.getCurrentDomainConfig();
    
    // If we have a tenant-specific domain, ensure we're using the right tenant context
    if (config.tenantId && (config.isCustomDomain || config.isSubdomain)) {
      // Store tenant context for the application
      sessionStorage.setItem('domain-tenant-id', config.tenantId);
    }

    return path;
  }

  // Get tenant ID from domain context (used by auth provider)
  getDomainTenantId(): string | null {
    return sessionStorage.getItem('domain-tenant-id');
  }
}

// Export singleton instance
export const domainRouter = new DomainRouter();

// Helper functions for domain-based routing
export const getCurrentDomain = () => window.location.hostname;

export const isDevelopmentDomain = (domain: string = getCurrentDomain()) => {
  return domain === 'localhost' || domain.endsWith('.lovableproject.com');
};

export const isCustomDomain = (domain: string = getCurrentDomain()) => {
  return !domain.endsWith('.vibepos.app') && 
         !domain.endsWith('.yourapp.com') && 
         !isDevelopmentDomain(domain);
};

export const isSubdomain = (domain: string = getCurrentDomain()) => {
  return domain.endsWith('.vibepos.app') || domain.endsWith('.yourapp.com');
};

export const getSubdomainName = (domain: string = getCurrentDomain()) => {
  if (isSubdomain(domain)) {
    return domain.split('.')[0];
  }
  return null;
};

// React hook for domain management
export const useDomainContext = () => {
  const [domainConfig, setDomainConfig] = React.useState<DomainRouterConfig | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    domainRouter.getCurrentDomainConfig().then((config) => {
      setDomainConfig(config);
      setLoading(false);
    });
  }, []);

  return {
    domainConfig,
    loading,
    refreshConfig: async () => {
      setLoading(true);
      const config = await domainRouter.getCurrentDomainConfig();
      setDomainConfig(config);
      setLoading(false);
    }
  };
};

export default domainRouter;