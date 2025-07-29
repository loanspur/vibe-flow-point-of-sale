import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TenantDomain {
  id: string;
  domain_name: string;
  domain_type: 'subdomain' | 'custom_domain';
  status: 'pending' | 'verifying' | 'verified' | 'failed' | 'expired';
  ssl_status: 'none' | 'pending' | 'issued' | 'expired' | 'failed';
  verification_token: string | null;
  verification_method: string | null;
  verification_value: string | null;
  verified_at: string | null;
  ssl_issued_at: string | null;
  ssl_expires_at: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useDomainManagement = () => {
  const { tenantId } = useAuth();
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchDomains();
    }
  }, [tenantId]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_domains')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching domains:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPrimaryDomain = () => {
    return domains.find(domain => domain.is_primary && domain.status === 'verified');
  };

  const getVerifiedDomains = () => {
    return domains.filter(domain => domain.status === 'verified' && domain.is_active);
  };

  const getTenantUrl = (domain?: TenantDomain) => {
    const targetDomain = domain || getPrimaryDomain();
    if (targetDomain) {
      return `https://${targetDomain.domain_name}`;
    }
    // Fallback to tenant ID based subdomain or default
    return `https://tenant-${tenantId}.vibenet.shop`;
  };

  const isDomainAvailable = async (domainName: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('is_domain_available', { domain_name_param: domainName });
      
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error checking domain availability:', err);
      return false;
    }
  };

  const addDomain = async (
    domainName: string, 
    domainType: 'subdomain' | 'custom_domain',
    verificationMethod?: 'dns_txt' | 'dns_cname' | 'file_upload'
  ) => {
    try {
      // Generate verification token
      const { data: verificationToken, error: tokenError } = await supabase
        .rpc('generate_domain_verification_token');

      if (tokenError) throw tokenError;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Create domain record
      const { error: insertError } = await supabase
        .from('tenant_domains')
        .insert({
          tenant_id: tenantId,
          domain_name: domainName,
          domain_type: domainType,
          verification_token: verificationToken,
          verification_method: verificationMethod || 'dns_txt',
          verification_value: domainType === 'subdomain' 
            ? `${verificationToken}.vibenet.shop` 
            : verificationToken,
          created_by: user.user.id,
          status: domainType === 'subdomain' ? 'verified' : 'pending'
        });

      if (insertError) throw insertError;

      await fetchDomains();
      return { success: true };
    } catch (err: any) {
      console.error('Error adding domain:', err);
      return { success: false, error: err.message };
    }
  };

  const verifyDomain = async (domainId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { domainId }
      });

      if (error) throw error;

      await fetchDomains();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error verifying domain:', err);
      return { success: false, error: err.message };
    }
  };

  const setPrimaryDomain = async (domainId: string) => {
    try {
      // Unset current primary domain
      await supabase
        .from('tenant_domains')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('is_primary', true);

      // Set new primary domain
      const { error } = await supabase
        .from('tenant_domains')
        .update({ is_primary: true })
        .eq('id', domainId);

      if (error) throw error;

      await fetchDomains();
      return { success: true };
    } catch (err: any) {
      console.error('Error setting primary domain:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      await fetchDomains();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting domain:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    domains,
    loading,
    error,
    fetchDomains,
    getPrimaryDomain,
    getVerifiedDomains,
    getTenantUrl,
    isDomainAvailable,
    addDomain,
    verifyDomain,
    setPrimaryDomain,
    deleteDomain
  };
};