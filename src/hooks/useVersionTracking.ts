import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ApplicationVersion {
  id: string;
  version_number: string;
  version_name: string | null;
  release_date: string;
  release_notes: string | null;
  is_current: boolean;
  is_stable: boolean;
  build_number: number | null;
  git_commit_hash: string | null;
  changelog: any;
  features_added: any;
  bugs_fixed: any;
  breaking_changes: any;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface CurrentVersionInfo {
  version_number: string;
  version_name: string | null;
  release_date: string;
  build_number: number | null;
  is_stable: boolean;
}

export interface TenantVersionTracking {
  id: string;
  tenant_id: string;
  version_id: string;
  deployed_at: string;
  deployment_method: string;
  deployment_status: string;
  performance_metrics: any;
  version: ApplicationVersion;
}

export const useVersionTracking = () => {
  const [currentVersion, setCurrentVersion] = useState<CurrentVersionInfo | null>(null);
  const [allVersions, setAllVersions] = useState<ApplicationVersion[]>([]);
  const [tenantVersion, setTenantVersion] = useState<TenantVersionTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentVersion = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_application_version');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCurrentVersion(data[0]);
      }
    } catch (err) {
      console.error('Error fetching current version:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch current version');
    }
  };

  const fetchAllVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('application_versions')
        .select('*')
        .order('release_date', { ascending: false });
      
      if (error) throw error;
      
      setAllVersions(data || []);
    } catch (err) {
      console.error('Error fetching versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    }
  };

  const fetchTenantVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_version_tracking')
        .select(`
          *,
          version:application_versions(*)
        `)
        .eq('deployment_status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setTenantVersion(data as unknown as TenantVersionTracking);
      }
    } catch (err) {
      console.error('Error fetching tenant version:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tenant version');
    }
  };

  const createNewVersion = async (versionData: {
    version_number: string;
    version_name?: string;
    release_notes?: string;
    is_current?: boolean;
    is_stable?: boolean;
    build_number?: number;
    git_commit_hash?: string;
    changelog?: any[];
    features_added?: string[];
    bugs_fixed?: string[];
    breaking_changes?: string[];
  }) => {
    try {
      const { data, error } = await supabase
        .from('application_versions')
        .insert(versionData)
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchAllVersions();
      if (versionData.is_current) {
        await fetchCurrentVersion();
      }
      
      return data;
    } catch (err) {
      console.error('Error creating version:', err);
      throw err;
    }
  };

  const setCurrentVersionById = async (versionNumber: string) => {
    try {
      const { data, error } = await supabase.rpc('set_current_version', {
        version_number_param: versionNumber
      });
      
      if (error) throw error;
      
      await fetchCurrentVersion();
      await fetchAllVersions();
      
      return data;
    } catch (err) {
      console.error('Error setting current version:', err);
      throw err;
    }
  };

  const trackTenantDeployment = async (
    tenantId: string,
    versionNumber: string,
    deploymentMethod: string = 'automatic'
  ) => {
    try {
      const { data, error } = await supabase.rpc('track_tenant_deployment', {
        tenant_id_param: tenantId,
        version_number_param: versionNumber,
        deployment_method_param: deploymentMethod
      });
      
      if (error) throw error;
      
      await fetchTenantVersion();
      
      return data;
    } catch (err) {
      console.error('Error tracking deployment:', err);
      throw err;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchCurrentVersion(),
          fetchAllVersions(),
          fetchTenantVersion()
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshData = async () => {
    await Promise.all([
      fetchCurrentVersion(),
      fetchAllVersions(),
      fetchTenantVersion()
    ]);
  };

  return {
    currentVersion,
    allVersions,
    tenantVersion,
    loading,
    error,
    createNewVersion,
    setCurrentVersionById,
    trackTenantDeployment,
    refreshData
  };
};