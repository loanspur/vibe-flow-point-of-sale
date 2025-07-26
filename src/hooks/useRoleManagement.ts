import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SystemFeature {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  feature_type: 'core' | 'premium' | 'enterprise' | 'addon';
  status: 'active' | 'inactive' | 'deprecated' | 'beta';
  category: string;
  icon?: string;
  requires_subscription: boolean;
  min_plan_level?: string;
  dependencies?: string[];
  metadata?: any;
  is_system_feature: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureSet {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  features: string[];
  is_system_set: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantFeatureAccess {
  id: string;
  tenant_id: string;
  feature_name: string;
  is_enabled: boolean;
  enabled_at: string;
  enabled_by?: string;
  expires_at?: string;
  usage_limit?: number;
  usage_count: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  template_data: any;
  category: string;
  is_system_template: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  permissions?: any;
  is_system_role: boolean;
  is_active: boolean;
  level?: number;
  can_manage_users?: boolean;
  can_manage_settings?: boolean;
  can_view_reports?: boolean;
  feature_set_id?: string;
  resource_limits?: any;
  color?: string;
  is_editable: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const useRoleManagement = () => {
  const { tenantId, userRole } = useAuth();
  const [systemFeatures, setSystemFeatures] = useState<SystemFeature[]>([]);
  const [featureSets, setFeatureSets] = useState<FeatureSet[]>([]);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeatureAccess[]>([]);
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all system features
  const fetchSystemFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('system_features')
        .select('*')
        .eq('status', 'active')
        .order('category', { ascending: true });

      if (error) throw error;
      setSystemFeatures(data || []);
    } catch (error) {
      console.error('Error fetching system features:', error);
      toast.error('Failed to load system features');
    }
  };

  // Fetch feature sets
  const fetchFeatureSets = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_sets')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setFeatureSets(data || []);
    } catch (error) {
      console.error('Error fetching feature sets:', error);
      toast.error('Failed to load feature sets');
    }
  };

  // Fetch tenant feature access
  const fetchTenantFeatures = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('tenant_feature_access')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('feature_name', { ascending: true });

      if (error) throw error;
      setTenantFeatures(data || []);
    } catch (error) {
      console.error('Error fetching tenant features:', error);
      toast.error('Failed to load tenant features');
    }
  };

  // Fetch permission templates
  const fetchPermissionTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_templates')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setPermissionTemplates(data || []);
    } catch (error) {
      console.error('Error fetching permission templates:', error);
      toast.error('Failed to load permission templates');
    }
  };

  // Fetch user roles
  const fetchUserRoles = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast.error('Failed to load user roles');
    }
  };

  // Enable/disable feature for tenant
  const toggleTenantFeature = async (featureName: string, enabled: boolean) => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('tenant_feature_access')
        .upsert({
          tenant_id: tenantId,
          feature_name: featureName,
          is_enabled: enabled,
          enabled_at: enabled ? new Date().toISOString() : null,
        }, {
          onConflict: 'tenant_id,feature_name'
        });

      if (error) throw error;
      
      await fetchTenantFeatures();
      toast.success(`Feature ${enabled ? 'enabled' : 'disabled'} successfully`);
      return true;
    } catch (error) {
      console.error('Error toggling tenant feature:', error);
      toast.error('Failed to update feature access');
      return false;
    }
  };

  // Create or update user role
  const saveUserRole = async (roleData: Partial<UserRole>) => {
    if (!tenantId) return false;

    try {
      const payload = {
        ...roleData,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      };

      let query;
      if (roleData.id) {
        query = supabase
          .from('user_roles')
          .update(payload)
          .eq('id', roleData.id);
      } else {
        query = supabase
          .from('user_roles')
          .insert([{ 
            ...payload, 
            name: payload.name || 'New Role', // Ensure name is provided
            tenant_id: tenantId,
            created_at: new Date().toISOString() 
          }]);
      }

      const { error } = await query;
      if (error) throw error;

      await fetchUserRoles();
      toast.success(`Role ${roleData.id ? 'updated' : 'created'} successfully`);
      return true;
    } catch (error) {
      console.error('Error saving user role:', error);
      toast.error('Failed to save role');
      return false;
    }
  };

  // Delete user role
  const deleteUserRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      await fetchUserRoles();
      toast.success('Role deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
      return false;
    }
  };

  // Apply feature set to tenant
  const applyFeatureSet = async (featureSetName: string) => {
    if (!tenantId) return false;

    try {
      const featureSet = featureSets.find(fs => fs.name === featureSetName);
      if (!featureSet) throw new Error('Feature set not found');

      // Enable all features in the set
      const promises = featureSet.features.map(featureName =>
        supabase
          .from('tenant_feature_access')
          .upsert({
            tenant_id: tenantId,
            feature_name: featureName,
            is_enabled: true,
            enabled_at: new Date().toISOString(),
          }, {
            onConflict: 'tenant_id,feature_name'
          })
      );

      await Promise.all(promises);
      await fetchTenantFeatures();
      toast.success(`${featureSet.display_name} applied successfully`);
      return true;
    } catch (error) {
      console.error('Error applying feature set:', error);
      toast.error('Failed to apply feature set');
      return false;
    }
  };

  // Check if user has specific feature access
  const hasFeatureAccess = (featureName: string): boolean => {
    if (userRole === 'superadmin') return true;
    
    const feature = tenantFeatures.find(tf => tf.feature_name === featureName);
    if (!feature) return false;
    
    if (!feature.is_enabled) return false;
    if (feature.expires_at && new Date(feature.expires_at) < new Date()) return false;
    
    return true;
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSystemFeatures(),
        fetchFeatureSets(),
        fetchTenantFeatures(),
        fetchPermissionTemplates(),
        fetchUserRoles(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [tenantId]);

  return {
    // Data
    systemFeatures,
    featureSets,
    tenantFeatures,
    permissionTemplates,
    userRoles,
    loading,

    // Actions
    toggleTenantFeature,
    saveUserRole,
    deleteUserRole,
    applyFeatureSet,
    hasFeatureAccess,
    loadAllData,

    // Fetch functions
    fetchSystemFeatures,
    fetchFeatureSets,
    fetchTenantFeatures,
    fetchPermissionTemplates,
    fetchUserRoles,
  };
};