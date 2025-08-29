import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DomainConfig {
  tenantId: string | null;
  domain: string;
  isCustomDomain: boolean;
  isSubdomain: boolean;
}

class DomainManager {
  private cache = new Map<string, { tenantId: string | null; timestamp: number }>();
  private negativeCache = new Map<string, number>(); // cache misses to prevent loops
  private readonly CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly NEGATIVE_CACHE_TIMEOUT = 10 * 1000; // 10 seconds dampening for misses (reduced)
  private initialized = false;
  private resolving = new Set<string>(); // Track domains being resolved

  constructor() {
    this.initializeIfNeeded();
  }

  private initializeIfNeeded() {
    if (typeof window === 'undefined' || this.initialized) return;
    
    this.initialized = true;
    // Don't auto-initialize - let the React hook handle it
    // This prevents circular dependency issues
  }

  private async initialize(): Promise<void> {
    try {
      const domainConfig = await this.getCurrentDomainConfig();
      
      // If on subdomain with tenant, set up context
      if (domainConfig?.isSubdomain && domainConfig.tenantId) {
        console.log('🏢 Setting up tenant context for:', domainConfig.tenantId);
        try {
          await this.setupTenantContext(domainConfig.tenantId);
        } catch (error) {
          console.warn('⚠️ Tenant context setup failed:', error);
        }
      }
    } catch (error) {
      console.warn('Domain initialization failed:', error);
    }
  }

  async setupTenantContext(tenantId: string): Promise<void> {
    try {
      // Verify tenant exists and is active (including trial status)
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('id', tenantId)
        .in('status', ['active', 'trial']) // Accept both active and trial tenants
        .maybeSingle();

      if (error) {
        console.warn(`Error fetching tenant ${tenantId}:`, error);
        return;
      }

      if (!tenant) {
        console.warn(`Tenant ${tenantId} not found or inactive`);
        return;
      }

      console.log(`✅ Tenant context set up for: ${tenant.name} (${tenant.status})`);
      
      // Store tenant context
      sessionStorage.setItem('domain-tenant-id', tenantId);
      sessionStorage.setItem('domain-tenant-name', tenant.name);
      sessionStorage.setItem('domain-tenant-status', tenant.status);
    } catch (error) {
      console.error('Error setting up tenant context:', error);
    }
  }

  private parseDomain(domain: string): DomainConfig {
    // Development domains
    if (domain === 'localhost' || domain.endsWith('.lovableproject.com')) {
      return { tenantId: null, domain, isCustomDomain: false, isSubdomain: false };
    }

    // Localhost subdomains (*.localhost)
    if (domain.endsWith('.localhost') && domain !== 'localhost') {
      return { tenantId: null, domain, isCustomDomain: false, isSubdomain: true };
    }

    // Main domains
    if (
      domain === 'vibenet.shop' || domain === 'www.vibenet.shop' ||
      domain === 'vibenet.online' || domain === 'www.vibenet.online'
    ) {
      return { tenantId: null, domain, isCustomDomain: false, isSubdomain: false };
    }

    // Subdomains (*.vibenet.shop | *.vibenet.online)
    if (domain.endsWith('.vibenet.shop') || domain.endsWith('.vibenet.online')) {
      return { tenantId: null, domain, isCustomDomain: false, isSubdomain: true };
    }

    // Custom domain
    return { tenantId: null, domain, isCustomDomain: true, isSubdomain: false };
  }

  async getCurrentDomainConfig(): Promise<DomainConfig> {
    const currentDomain = window.location.hostname;
    
    // Check cache first
    const cached = this.cache.get(currentDomain);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIMEOUT) {
      return {
        tenantId: cached.tenantId,
        domain: currentDomain,
        isCustomDomain: !currentDomain.endsWith('.vibenet.shop') && !currentDomain.endsWith('.vibenet.online') && !currentDomain.endsWith('.localhost') && currentDomain !== 'vibenet.shop' && currentDomain !== 'vibenet.online' && currentDomain !== 'localhost' && !currentDomain.endsWith('.lovableproject.com'),
        isSubdomain: (currentDomain.endsWith('.vibenet.shop') && currentDomain !== 'vibenet.shop') || (currentDomain.endsWith('.vibenet.online') && currentDomain !== 'vibenet.online') || (currentDomain.endsWith('.localhost') && currentDomain !== 'localhost')
      };
    }

    const domainInfo = this.parseDomain(currentDomain);

    // If we recently confirmed no tenant for this domain, short-circuit to avoid tight loops
    const negTs = this.negativeCache.get(currentDomain);
    if (negTs && Date.now() - negTs < this.NEGATIVE_CACHE_TIMEOUT) {
      return domainInfo;
    }

    // For development/main domains, return as-is
    if (currentDomain === 'localhost' || 
        currentDomain.endsWith('.lovableproject.com') ||
        currentDomain === 'vibenet.shop' || 
        currentDomain === 'www.vibenet.shop' ||
        currentDomain === 'vibenet.online' ||
        currentDomain === 'www.vibenet.online') {
      console.log('🏠 Development/main domain detected:', currentDomain);
      return domainInfo;
    }

    // Handle localhost subdomains
    if (currentDomain.endsWith('.localhost') && currentDomain !== 'localhost') {
      console.log('🏠 Localhost subdomain detected:', currentDomain);
      
      // Extract subdomain name
      const subdomain = currentDomain.replace('.localhost', '');
      
      try {
        // Query database for tenant with this subdomain
        const { data: tenants, error } = await supabase
          .from('tenants')
          .select('id, name, subdomain, status')
          .eq('subdomain', subdomain)
          .in('status', ['active', 'trial'])
          .limit(1);

        if (error) {
          console.warn('⚠️ Error querying tenants for localhost subdomain:', error);
          this.negativeCache.set(currentDomain, Date.now());
          return domainInfo;
        }

        if (tenants && tenants.length > 0) {
          const tenantId = tenants[0].id;
          console.log(`✅ Resolved localhost tenant: ${subdomain} -> ${tenantId}`);
          
          const resolvedConfig: DomainConfig = {
            ...domainInfo,
            tenantId
          };
          
          // Cache the result
          this.cache.set(currentDomain, {
            tenantId,
            timestamp: Date.now()
          });
          
          return resolvedConfig;
        } else {
          console.warn(`⚠️ No tenant found for localhost subdomain: ${subdomain}`);
          this.negativeCache.set(currentDomain, Date.now());
          return domainInfo;
        }
      } catch (error) {
        console.warn('⚠️ Failed to resolve localhost tenant:', error);
        this.negativeCache.set(currentDomain, Date.now());
        return domainInfo;
      }
    }

    // Prevent concurrent resolutions for the same domain
    if (this.resolving.has(currentDomain)) {
      console.log('⏳ Domain already being resolved, waiting...', currentDomain);
      // Wait for ongoing resolution to complete with shorter timeout
      let attempts = 0;
      while (this.resolving.has(currentDomain) && attempts < 30) { // 3 second timeout
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      // If timeout reached, force continue with resolution
      if (attempts >= 30) {
        console.warn('⚠️ Domain resolution timeout, forcing new resolution for:', currentDomain);
        this.resolving.delete(currentDomain);
      }
      
      // Check cache again after waiting
      const cachedAfterWait = this.cache.get(currentDomain);
      if (cachedAfterWait && Date.now() - cachedAfterWait.timestamp < this.CACHE_TIMEOUT) {
        console.log('📦 Using cached config after wait:', currentDomain);
        return {
          tenantId: cachedAfterWait.tenantId,
          domain: currentDomain,
          isCustomDomain: !currentDomain.endsWith('.vibenet.shop') && !currentDomain.endsWith('.vibenet.online') && !currentDomain.endsWith('.localhost') && currentDomain !== 'vibenet.shop' && currentDomain !== 'vibenet.online' && currentDomain !== 'localhost' && !currentDomain.endsWith('.lovableproject.com'),
          isSubdomain: (currentDomain.endsWith('.vibenet.shop') && currentDomain !== 'vibenet.shop') || (currentDomain.endsWith('.vibenet.online') && currentDomain !== 'vibenet.online') || (currentDomain.endsWith('.localhost') && currentDomain !== 'localhost')
        };
      }
      const negAfterWait = this.negativeCache.get(currentDomain);
      if (negAfterWait && Date.now() - negAfterWait < this.NEGATIVE_CACHE_TIMEOUT) {
        return domainInfo;
      }
    }

    // Mark this domain as being resolved
    this.resolving.add(currentDomain);
    
    try {
      // Resolve tenant ID from database
      const { data: tenantId, error } = await supabase
        .rpc('get_tenant_by_domain', { domain_name_param: currentDomain });

      if (error) {
        console.error('❌ Error resolving tenant by domain:', error);
        this.resolving.delete(currentDomain); // Clean up
        return domainInfo;
      }

      let resolvedTenantId: string | null = tenantId || null;

      // If not found and this is a known subdomain, try alternate TLD (.shop <-> .online)
      if (!resolvedTenantId && domainInfo.isSubdomain) {
        const altDomain = currentDomain.endsWith('.vibenet.online')
          ? currentDomain.replace(/\.vibenet\.online$/, '.vibenet.shop')
          : currentDomain.endsWith('.vibenet.shop')
            ? currentDomain.replace(/\.vibenet\.shop$/, '.vibenet.online')
            : null;

        if (altDomain) {
          console.log('�� Trying alternate TLD for domain resolution:', altDomain);
          const { data: altTenantId, error: altError } = await supabase
            .rpc('get_tenant_by_domain', { domain_name_param: altDomain });
          if (altError) {
            console.warn('⚠️ Alternate TLD resolution error:', altError);
          } else if (altTenantId) {
            resolvedTenantId = altTenantId;
            console.log('✅ Resolved via alternate TLD:', altTenantId);
          }
        }
      }

      console.log('✅ Tenant resolved:', resolvedTenantId);

      const resolvedConfig: DomainConfig = {
        ...domainInfo,
        tenantId: resolvedTenantId
      };

      // Cache the result
      if (resolvedTenantId) {
        this.cache.set(currentDomain, {
          tenantId: resolvedTenantId,
          timestamp: Date.now()
        });
        console.log('💾 Cached domain config for:', currentDomain);
      } else {
        // Negative cache to prevent rapid re-resolution loops
        this.negativeCache.set(currentDomain, Date.now());
      }

      this.resolving.delete(currentDomain); // Clean up
      return resolvedConfig;
    } catch (error) {
      console.error('❌ Error in getCurrentDomainConfig:', error);
      this.resolving.delete(currentDomain); // Clean up
      return domainInfo;
    }
  }

  async resolveTenantFromDomain(domain?: string): Promise<string | null> {
    const targetDomain = domain || window.location.hostname;
    
    // Check cache first
    const cached = this.cache.get(targetDomain);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIMEOUT) {
      return cached.tenantId;
    }

    try {
      const { data: tenantId, error } = await supabase
        .rpc('get_tenant_by_domain', { domain_name_param: targetDomain });

      if (error) {
        console.error('Error resolving tenant:', error);
        return null;
      }

      let resolvedTenantId: string | null = tenantId || null;

      // If not found, try alternate TLD
      const isVibenetSub = (d: string) => (d.endsWith('.vibenet.shop') && d !== 'vibenet.shop') || (d.endsWith('.vibenet.online') && d !== 'vibenet.online');
      if (!resolvedTenantId && isVibenetSub(targetDomain)) {
        const altDomain = targetDomain.endsWith('.vibenet.online')
          ? targetDomain.replace(/\.vibenet\.online$/, '.vibenet.shop')
          : targetDomain.endsWith('.vibenet.shop')
            ? targetDomain.replace(/\.vibenet\.shop$/, '.vibenet.online')
            : null;
        if (altDomain) {
          const { data: altTenantId, error: altError } = await supabase
            .rpc('get_tenant_by_domain', { domain_name_param: altDomain });
          if (altError) {
            console.warn('Alternate TLD resolution error:', altError);
          } else if (altTenantId) {
            resolvedTenantId = altTenantId;
          }
        }
      }

      // Cache the result
      if (resolvedTenantId) {
        this.cache.set(targetDomain, {
          tenantId: resolvedTenantId,
          timestamp: Date.now()
        });
      }

      return resolvedTenantId;
    } catch (error) {
      console.error('Error resolving tenant from domain:', error);
      return null;
    }
  }

  // Get tenant ID from context
  getDomainTenantId(): string | null {
    return sessionStorage.getItem('domain-tenant-id');
  }

  // Get tenant name from context  
  getDomainTenantName(): string | null {
    return sessionStorage.getItem('domain-tenant-name');
  }

  // Clear cache and context
  clearCache(domain?: string): void {
    if (domain) {
      this.cache.delete(domain);
    } else {
      this.cache.clear();
    }
  }

  clearTenantContext(): void {
    sessionStorage.removeItem('domain-tenant-id');
    sessionStorage.removeItem('domain-tenant-name');
    sessionStorage.removeItem('domain-tenant-status');
  }

  // Utility functions
  validateSubdomain(subdomain: string): boolean {
    const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    return subdomainRegex.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 63;
  }

  validateCustomDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])*(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])*)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  generateTenantUrl(tenantId: string, subdomain?: string, customDomain?: string): string {
    if (customDomain) {
      return `https://${customDomain}`;
    }
    
    const base = getBaseDomain();
    if (subdomain) {
      return `https://${subdomain}.${base}`;
    }

    return `https://tenant-${tenantId}.${base}`;
  }

  generateSubdomainFromTenantName(tenantName: string): string {
    return tenantName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63);
  }
}

// Export singleton instance
export const domainManager = new DomainManager();

// Helper functions
export const getCurrentDomain = () => window.location.hostname;

export const isDevelopmentDomain = (domain: string = getCurrentDomain()) => {
  return domain === 'localhost' || domain.endsWith('.lovableproject.com');
};

export const getBaseDomain = (domain: string = getCurrentDomain()) => {
  // Respect environment: use the current TLD if already on vibenet.shop or vibenet.online
  if (
    domain === 'localhost' ||
    domain.endsWith('.lovableproject.com')
  ) {
    return 'vibenet.online';
  }
  if (
    domain === 'vibenet.online' || domain === 'www.vibenet.online' ||
    domain.endsWith('.vibenet.online')
  ) {
    return 'vibenet.online';
  }
  return 'vibenet.shop';
};

export const isCustomDomain = (domain: string = getCurrentDomain()) => {
  const isMain = domain === 'vibenet.shop' || domain === 'vibenet.online';
  const isSub = domain.endsWith('.vibenet.shop') || domain.endsWith('.vibenet.online') || (domain.endsWith('.localhost') && domain !== 'localhost');
  return !isSub && !isMain && !isDevelopmentDomain(domain);
};

export const isSubdomain = (domain: string = getCurrentDomain()) => {
  return (domain.endsWith('.vibenet.shop') && domain !== 'vibenet.shop') ||
         (domain.endsWith('.vibenet.online') && domain !== 'vibenet.online') ||
         (domain.endsWith('.localhost') && domain !== 'localhost');
};

export const getSubdomainName = (domain: string = getCurrentDomain()) => {
  if (isSubdomain(domain)) {
    return domain.split('.')[0];
  }
  return null;
};

// Global state to prevent multiple hook instances from initializing
let globalDomainConfig: DomainConfig | null = null;
let globalLoading = true;
let globalInitialized = false;
let globalPromise: Promise<DomainConfig> | null = null;

// React hook for domain management
export const useDomainContext = () => {
  const [domainConfig, setDomainConfig] = React.useState<DomainConfig | null>(globalDomainConfig);
  const [loading, setLoading] = React.useState(globalLoading);
  const [initialized, setInitialized] = React.useState(globalInitialized);

  React.useEffect(() => {
    // If already initialized globally, use the cached result
    if (globalInitialized && globalDomainConfig) {
      setDomainConfig(globalDomainConfig);
      setLoading(false);
      setInitialized(true);
      return;
    }

    // If initialization is in progress, wait for it
    if (globalPromise) {
      globalPromise.then((config) => {
        setDomainConfig(config);
        setLoading(false);
        setInitialized(true);
      }).catch((error) => {
        console.error('Domain initialization failed:', error);
        const fallbackConfig: DomainConfig = {
          tenantId: null,
          domain: window.location.hostname,
          isCustomDomain: false,
          isSubdomain: false
        };
        setDomainConfig(fallbackConfig);
        setLoading(false);
        setInitialized(true);
      });
      return;
    }

    // Start initialization
    const initializeDomain = async (): Promise<DomainConfig> => {
      console.log('🌐 Initializing domain context for:', window.location.hostname);
      
      const config = await domainManager.getCurrentDomainConfig();
      console.log('🔍 Domain config resolved:', config);
      
      // Set up tenant context if needed
      if (config?.isSubdomain && config.tenantId) {
        console.log('🏢 Setting up tenant context for:', config.tenantId);
        try {
          await domainManager.setupTenantContext(config.tenantId);
        } catch (error) {
          console.warn('⚠️ Tenant context setup failed:', error);
        }
      }
      
      // Update global state
      globalDomainConfig = config;
      globalLoading = false;
      globalInitialized = true;
      
      return config;
    };

    // Create and store the promise
    globalPromise = initializeDomain();
    
    globalPromise.then((config) => {
      setDomainConfig(config);
      setLoading(false);
      setInitialized(true);
    }).catch((error) => {
      console.error('Domain initialization failed:', error);
      const fallbackConfig: DomainConfig = {
        tenantId: null,
        domain: window.location.hostname,
        isCustomDomain: false,
        isSubdomain: false
      };
      globalDomainConfig = fallbackConfig;
      globalLoading = false;
      globalInitialized = true;
      
      setDomainConfig(fallbackConfig);
      setLoading(false);
      setInitialized(true);
    });

  }, []); // Empty dependency array - only run once

  return {
    domainConfig,
    loading,
    refreshConfig: async () => {
      // Reset global state for refresh
      globalDomainConfig = null;
      globalLoading = true;
      globalInitialized = false;
      globalPromise = null;
      
      setLoading(true);
      const config = await domainManager.getCurrentDomainConfig();
      
      globalDomainConfig = config;
      globalLoading = false;
      globalInitialized = true;
      
      setDomainConfig(config);
      setLoading(false);
    }
  };
};

export default domainManager;
