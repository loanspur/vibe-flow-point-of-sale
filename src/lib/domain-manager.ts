import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from './logger';

export interface DomainConfig {
  tenantId: string | null;
  domain: string;
  isCustomDomain: boolean;
  isSubdomain: boolean;
  allowTenantlessAuth?: boolean;
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
        log.trace("domain", "Setting up tenant context for:", domainConfig.tenantId);
        try {
          await this.setupTenantContext(domainConfig.tenantId);
        } catch (error) {
          log.warn('Tenant context setup failed:', error);
        }
      }
    } catch (error) {
      log.warn('Domain initialization failed:', error);
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
        log.warn(`Error fetching tenant ${tenantId}:`, error);
        return;
      }

      if (!tenant) {
        log.warn(`Tenant ${tenantId} not found or inactive`);
        return;
      }

      log.trace("domain", `Tenant context set up for: ${tenant.name} (${tenant.status})`);
      
      // Store tenant context
      sessionStorage.setItem('domain-tenant-id', tenantId);
      sessionStorage.setItem('domain-tenant-name', tenant.name);
      sessionStorage.setItem('domain-tenant-status', tenant.status);
    } catch (error) {
      log.error('Error setting up tenant context:', error);
    }
  }

  private parseDomain(domain: string): DomainConfig {
    // Development domains (main domains only)
    if (domain === 'localhost' || domain.endsWith('.lovableproject.com')) {
      return { tenantId: null, domain, isCustomDomain: false, isSubdomain: false };
    }
    
    // Localhost subdomains (any domain ending with .localhost except localhost itself)
    if (domain.endsWith('.localhost') && domain !== 'localhost') {
      return { tenantId: null, domain, isCustomDomain: false, isSubdomain: true };
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
    const pathname = window.location.pathname;
    
    log.trace("domain", { host: currentDomain, pathname, isSubdomain: currentDomain.endsWith('.localhost') && currentDomain !== 'localhost' });
    
    // Check cache first
    const cached = this.cache.get(currentDomain);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIMEOUT) {
      const config = {
        tenantId: cached.tenantId,
        domain: currentDomain,
        isCustomDomain: !currentDomain.endsWith('.vibenet.shop') && !currentDomain.endsWith('.vibenet.online') && !currentDomain.endsWith('.localhost') && currentDomain !== 'vibenet.shop' && currentDomain !== 'vibenet.online' && currentDomain !== 'localhost' && !currentDomain.endsWith('.lovableproject.com'),
        isSubdomain: (currentDomain.endsWith('.vibenet.shop') && currentDomain !== 'vibenet.shop') || (currentDomain.endsWith('.vibenet.online') && currentDomain !== 'vibenet.online') || (currentDomain.endsWith('.localhost') && currentDomain !== 'localhost')
      };
      log.trace("domain", "resolved-config", config);
      return config;
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
      log.trace("domain", 'Development/main domain detected:', currentDomain);
      return domainInfo;
    }

    // Handle localhost subdomains
    if (currentDomain.endsWith('.localhost') && currentDomain !== 'localhost') {
      log.trace("domain", 'Localhost subdomain detected:', currentDomain);
      
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
          log.warn('Error querying tenants for localhost subdomain:', error);
          this.negativeCache.set(currentDomain, Date.now());
          return domainInfo;
        }

        if (tenants && tenants.length > 0) {
          const tenantId = tenants[0].id;
          log.trace("domain", `Resolved localhost tenant: ${subdomain} -> ${tenantId}`);
          
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
          log.warn(`No tenant found for localhost subdomain: ${subdomain}, tenantless auth allowed on localhost`);
          this.negativeCache.set(currentDomain, Date.now());
          const config = {
            ...domainInfo,
            allowTenantlessAuth: true
          };
          log.trace("domain", "resolved-config", config);
          return config;
        }
      } catch (error) {
        log.warn('Failed to resolve localhost tenant:', error);
        this.negativeCache.set(currentDomain, Date.now());
        return domainInfo;
      }
    }

    // Prevent concurrent resolutions for the same domain
    if (this.resolving.has(currentDomain)) {
      log.trace("domain", 'Domain already being resolved, waiting...', currentDomain);
      // Wait for ongoing resolution to complete with shorter timeout
      let attempts = 0;
      while (this.resolving.has(currentDomain) && attempts < 30) { // 3 second timeout
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      // If timeout reached, force continue with resolution
      if (attempts >= 30) {
        log.warn('Domain resolution timeout, forcing new resolution for:', currentDomain);
        this.resolving.delete(currentDomain);
      }
      
      // Check cache again after waiting
      const cachedAfterWait = this.cache.get(currentDomain);
      if (cachedAfterWait && Date.now() - cachedAfterWait.timestamp < this.CACHE_TIMEOUT) {
        log.trace("domain", 'Using cached config after wait:', currentDomain);
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
      // console.log('🔎 Resolving tenant for domain:', currentDomain);
      
      // Special handling for localhost subdomains
      let resolvedTenantId: string | null = null;
      if (currentDomain.endsWith('.localhost') && currentDomain !== 'localhost') {
        // Extract the full subdomain part (everything before .localhost)
        const subdomainPart = currentDomain.replace('.localhost', '');
        log.trace("domain", 'Resolving localhost subdomain:', subdomainPart);
        
        // Try to find tenant by subdomain
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name, subdomain')
          .eq('subdomain', subdomainPart)
          .in('status', ['active', 'trial'])
          .maybeSingle();
          
        if (tenantError) {
          log.warn('Error finding tenant by subdomain:', tenantError);
        } else if (tenant) {
          resolvedTenantId = tenant.id;
          log.trace("domain", 'Found tenant for localhost subdomain:', resolvedTenantId, 'Name:', tenant.name, 'Subdomain:', tenant.subdomain);
        } else {
          // Debug: Let's see what tenants exist with similar names
          const { data: allTenants, error: allError } = await supabase
            .from('tenants')
            .select('id, name, subdomain, status')
            .in('status', ['active', 'trial']);
            
          if (!allError && allTenants) {
            log.trace("domain", 'Available tenants:', allTenants.map(t => ({ name: t.name, subdomain: t.subdomain, status: t.status })));
            
            // Try to find by normalized name
            for (const t of allTenants) {
              const normalizedName = t.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              if (normalizedName === subdomainPart) {
                resolvedTenantId = t.id;
                log.trace("domain", 'Found tenant by normalized name:', resolvedTenantId, 'Name:', t.name, 'Subdomain:', t.subdomain);
                break;
              }
            }
            
            // If still not found, try to find by partial subdomain match
            if (!resolvedTenantId) {
              for (const t of allTenants) {
                if (t.subdomain && subdomainPart.includes(t.subdomain)) {
                  resolvedTenantId = t.id;
                  log.trace("domain", 'Found tenant by partial subdomain match:', resolvedTenantId, 'Name:', t.name, 'Subdomain:', t.subdomain);
                  break;
                }
              }
            }
            
            // If still not found, try to find by partial name match
            if (!resolvedTenantId) {
              for (const t of allTenants) {
                const normalizedTenantName = t.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                if (normalizedTenantName && subdomainPart.includes(normalizedTenantName)) {
                  resolvedTenantId = t.id;
                  log.trace("domain", 'Found tenant by partial name match:', resolvedTenantId, 'Name:', t.name, 'Subdomain:', t.subdomain);
                  break;
                }
              }
            }
          }
          
          // If no tenant found for localhost subdomain, allow tenantless auth
          if (!resolvedTenantId && currentDomain.endsWith('.localhost') && currentDomain !== 'localhost') {
            log.warn(`No tenant found for localhost subdomain: ${subdomainPart}, tenantless auth allowed on localhost`);
            const localhostConfig: DomainConfig = {
              ...domainInfo,
              allowTenantlessAuth: true
            };
            
            // Cache the result
            this.negativeCache.set(currentDomain, Date.now());
            this.resolving.delete(currentDomain);
            return localhostConfig;
          }
        }
      }
      
      // If not resolved by localhost logic, try normal domain resolution
      if (!resolvedTenantId) {
      const { data: tenantId, error } = await supabase
        .rpc('get_tenant_by_domain', { domain_name_param: currentDomain });

      if (error) {
        log.error('Error resolving tenant by domain:', error);
        this.resolving.delete(currentDomain); // Clean up
        return domainInfo;
      }

        resolvedTenantId = tenantId || null;
      }

      // If not found and this is a known subdomain, try alternate TLD (.shop <-> .online)
      if (!resolvedTenantId && domainInfo.isSubdomain) {
        const altDomain = currentDomain.endsWith('.vibenet.online')
          ? currentDomain.replace(/\.vibenet\.online$/, '.vibenet.shop')
          : currentDomain.endsWith('.vibenet.shop')
            ? currentDomain.replace(/\.vibenet\.shop$/, '.vibenet.online')
            : null;

        if (altDomain) {
          log.trace("domain", 'Trying alternate TLD for domain resolution:', altDomain);
          const { data: altTenantId, error: altError } = await supabase
            .rpc('get_tenant_by_domain', { domain_name_param: altDomain });
          if (altError) {
            log.warn('Alternate TLD resolution error:', altError);
          } else if (altTenantId) {
            resolvedTenantId = altTenantId;
            log.trace("domain", 'Resolved via alternate TLD:', altTenantId);
          }
        }
      }

      log.trace("domain", 'Tenant resolved:', resolvedTenantId);

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
        log.trace("domain", 'Cached domain config for:', currentDomain);
      } else {
        // Negative cache to prevent rapid re-resolution loops
        this.negativeCache.set(currentDomain, Date.now());
      }

      this.resolving.delete(currentDomain); // Clean up
      return resolvedConfig;
    } catch (error) {
      log.error('Error in getCurrentDomainConfig:', error);
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
        log.error('Error resolving tenant:', error);
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
          log.warn('Alternate TLD resolution error:', altError);
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
      log.error('Error resolving tenant from domain:', error);
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

export function isAllowedTenantlessAuthPath(pathname: string): boolean {
  return pathname.startsWith("/auth");
}

export const isDevelopmentDomain = (domain: string = getCurrentDomain()) => {
  return domain === 'localhost' || domain.endsWith('.lovableproject.com') || domain.endsWith('.localhost');
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
    if (domain.endsWith('.localhost')) {
      return domain.replace('.localhost', '');
    }
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
        log.error('Domain initialization failed:', error);
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
      log.trace("domain", 'Initializing domain context for:', window.location.hostname);
      
      const config = await domainManager.getCurrentDomainConfig();
      log.trace("domain", 'Domain config resolved:', config);
      
      // Set up tenant context if needed
      if (config?.isSubdomain && config.tenantId) {
        log.trace("domain", 'Setting up tenant context for:', config.tenantId);
        try {
          await domainManager.setupTenantContext(config.tenantId);
        } catch (error) {
          log.warn('Tenant context setup failed:', error);
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
      log.error('Domain initialization failed:', error);
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

/**
 * Helper function to determine if auth can be rendered without a tenant
 * @param cfg Domain configuration
 * @param path Current pathname
 * @returns true if auth can be rendered without tenant
 */
export function canRenderAuthWithoutTenant(cfg: DomainConfig, path: string): boolean {
  return cfg?.allowTenantlessAuth && path.startsWith("/auth");
}

export default domainManager;
