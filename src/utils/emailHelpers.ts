import { supabase } from '@/integrations/supabase/client';
import { domainRouter } from '@/lib/domain-router';

/**
 * Generates tenant-specific URLs for emails
 */
export const generateTenantEmailUrls = async (tenantId: string) => {
  try {
    // Get tenant's primary domain configuration
    const { data: tenantDomain } = await supabase
      .from('tenant_domains')
      .select('domain_name, domain_type, is_primary')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .single();

    if (tenantDomain) {
      const baseUrl = tenantDomain.domain_type === 'custom_domain' 
        ? `https://${tenantDomain.domain_name}`
        : `https://${tenantDomain.domain_name}`;
      
      return {
        loginUrl: `${baseUrl}/auth`,
        dashboardUrl: `${baseUrl}/admin`,
        supportUrl: `${baseUrl}/support`,
        passwordResetUrl: `${baseUrl}/reset-password`,
        baseUrl,
        domain: tenantDomain.domain_name,
        isCustomDomain: tenantDomain.domain_type === 'custom_domain'
      };
    }

    // Fallback to default subdomain
    const fallbackDomain = `tenant-${tenantId}.vibenet.shop`;
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
    
    // Ultra fallback
    const fallbackDomain = `tenant-${tenantId}.vibenet.shop`;
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