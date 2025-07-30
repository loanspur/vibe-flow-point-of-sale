import { domainRouter } from './domain-router';
import { supabase } from '@/integrations/supabase/client';

export class SubdomainInitializer {
  private static instance: SubdomainInitializer;
  private initialized = false;

  static getInstance(): SubdomainInitializer {
    if (!SubdomainInitializer.instance) {
      SubdomainInitializer.instance = new SubdomainInitializer();
    }
    return SubdomainInitializer.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing subdomain routing...');
      
      // Get current domain configuration
      const domainConfig = await domainRouter.getCurrentDomainConfig();
      console.log('Domain config:', domainConfig);

      // If we're on a subdomain, ensure proper routing context
      if (domainConfig?.isSubdomain && domainConfig.tenantId) {
        await this.setupSubdomainContext(domainConfig.tenantId);
      }

      this.initialized = true;
      console.log('Subdomain routing initialized successfully');
    } catch (error) {
      console.error('Failed to initialize subdomain routing:', error);
    }
  }

  private async setupSubdomainContext(tenantId: string): Promise<void> {
    try {
      // Verify tenant exists and is active
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, subdomain, status')
        .eq('id', tenantId)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !tenant) {
        console.warn(`Tenant ${tenantId} not found or inactive`);
        return;
      }

      // Store tenant context for the application
      sessionStorage.setItem('subdomain-tenant-id', tenantId);
      sessionStorage.setItem('subdomain-tenant-name', tenant.name);
      
      console.log(`Subdomain context established for tenant: ${tenant.name} (${tenantId})`);

      // Trigger a domain-based navigation setup
      await domainRouter.handleDomainBasedNavigation(window.location.pathname);
    } catch (error) {
      console.error('Error setting up subdomain context:', error);
    }
  }

  getSubdomainTenantId(): string | null {
    return sessionStorage.getItem('subdomain-tenant-id');
  }

  getSubdomainTenantName(): string | null {
    return sessionStorage.getItem('subdomain-tenant-name');
  }

  clearSubdomainContext(): void {
    sessionStorage.removeItem('subdomain-tenant-id');
    sessionStorage.removeItem('subdomain-tenant-name');
    sessionStorage.removeItem('domain-tenant-id');
  }
}

// Export singleton instance
export const subdomainInitializer = SubdomainInitializer.getInstance();

// Auto-initialize when module is loaded (for immediate subdomain detection)
if (typeof window !== 'undefined') {
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      subdomainInitializer.initialize();
    });
  } else {
    // DOM is already ready
    subdomainInitializer.initialize();
  }
}