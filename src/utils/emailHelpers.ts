import { supabase } from '@/integrations/supabase/client';
import { domainManager } from '@/lib/domain-manager';
import { getBaseDomain } from '@/lib/domain-manager';

/**
 * Generates tenant-specific URLs for emails
 */
export const generateTenantEmailUrls = async (tenantId: string) => {
  try {
    // Get tenant's active verified domain configurations (may have multiple)
    const { data: tenantDomains } = await supabase
      .from('tenant_domains')
      .select('domain_name, domain_type, is_primary, status, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('status', 'verified')
      .order('is_primary', { ascending: false });

    if (tenantDomains && tenantDomains.length > 0) {
      // Prefer: primary custom domain > primary .vibenet.online > any .vibenet.online > primary anything > first
      const chosen =
        tenantDomains.find(d => d.domain_type === 'custom_domain' && d.is_primary) ||
        tenantDomains.find(d => d.domain_name.endsWith('.vibenet.online') && d.is_primary) ||
        tenantDomains.find(d => d.domain_name.endsWith('.vibenet.online')) ||
        tenantDomains.find(d => d.is_primary) ||
        tenantDomains[0];

      const baseUrl = `https://${chosen.domain_name}`;
      return {
        loginUrl: `${baseUrl}/auth`,
        dashboardUrl: `${baseUrl}/admin`,
        supportUrl: `${baseUrl}/support`,
        passwordResetUrl: `${baseUrl}/reset-password`,
        baseUrl,
        domain: chosen.domain_name,
        isCustomDomain: chosen.domain_type === 'custom_domain'
      };
    }

    const base = getBaseDomain();
    const fallbackDomain = `tenant-${tenantId}.${base}`;
    const fallbackUrl = `https://${fallbackDomain}`;
    
    return {
      loginUrl: `${fallbackUrl}/auth`,
      dashboardUrl: `${fallbackUrl}/admin`,
      supportUrl: `${fallbackUrl}/support`,
      passwordResetUrl: `${fallbackUrl}/reset-password`,
      baseUrl: fallbackUrl,
      domain: fallbackDomain,
      isCustomDomain: false
    };
  } catch (error) {
    console.error('Error generating tenant URLs:', error);
    
    const base = getBaseDomain();
    const fallbackDomain = `tenant-${tenantId}.${base}`;
    const fallbackUrl = `https://${fallbackDomain}`;
    
    return {
      loginUrl: `${fallbackUrl}/auth`,
      dashboardUrl: `${fallbackUrl}/admin`,
      supportUrl: `${fallbackUrl}/support`,
      passwordResetUrl: `${fallbackUrl}/reset-password`,
      baseUrl: fallbackUrl,
      domain: fallbackDomain,
      isCustomDomain: false
    };
  }
};

/**
 * Validates email template variables for tenant context
 */
export const validateEmailTemplate = (htmlContent: string, textContent?: string) => {
  const requiredVariables = [
    'tenant_url',
    'login_url',
    'dashboard_url',
    'support_url'
  ];
  
  const optionalVariables = [
    'user_name',
    'company_name',
    'tenant_name',
    'order_number',
    'amount'
  ];

  const missingRequired: string[] = [];
  const foundVariables: string[] = [];

  const content = `${htmlContent} ${textContent || ''}`;
  
  [...requiredVariables, ...optionalVariables].forEach(variable => {
    const regex = new RegExp(`{{${variable}}}`, 'g');
    if (regex.test(content)) {
      foundVariables.push(variable);
    } else if (requiredVariables.includes(variable)) {
      missingRequired.push(variable);
    }
  });

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    foundVariables,
    warnings: missingRequired.length > 0 
      ? [`Missing required variables: ${missingRequired.join(', ')}`]
      : []
  };
};

/**
 * Processes email content with proper tenant context
 */
export const processEmailContent = async (
  content: string, 
  variables: Record<string, any>, 
  tenantId: string
) => {
  try {
    // Generate tenant URLs
    const tenantUrls = await generateTenantEmailUrls(tenantId);
    
    // Enhance variables with tenant-specific URLs
    const enhancedVariables = {
      ...variables,
      ...tenantUrls
    };

    let processedContent = content;
    
    // Replace all variables in content
    for (const [key, value] of Object.entries(enhancedVariables)) {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(
        new RegExp(placeholder, 'g'), 
        String(value)
      );
    }

    return {
      content: processedContent,
      variables: enhancedVariables,
      tenantUrls
    };
  } catch (error) {
    console.error('Error processing email content:', error);
    throw error;
  }
};