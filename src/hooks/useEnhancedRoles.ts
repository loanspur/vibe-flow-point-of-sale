import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EnhancedUserRole {
  id: string;
  name: string;
  description?: string;
  level: number;
  color: string;
  is_active: boolean;
  is_editable: boolean;
  tenant_id: string;
  permissions: SystemPermission[];
  created_at: string;
  updated_at: string;
}

export interface SystemPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  category: string;
  is_critical: boolean;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  tenant_id: string;
  assigned_by: string;
  is_active: boolean;
  assigned_at: string;
}

export const useEnhancedRoles = () => {
  const { user, tenantId } = useAuth();
  const [roles, setRoles] = useState<EnhancedUserRole[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [userRoleAssignments, setUserRoleAssignments] = useState<UserRoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all system permissions
  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('system_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('resource', { ascending: true })
        .order('action', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    }
  };

  // Fetch roles with their permissions
  const fetchRolesWithPermissions = async () => {
    if (!tenantId) return;

    try {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('level', { ascending: true });

      if (rolesError) throw rolesError;

      // Fetch role permissions
      const { data: rolePermissions, error: rolePermError } = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          permission_id,
          granted,
          system_permissions (*)
        `)
        .eq('granted', true);

      if (rolePermError) throw rolePermError;

      // Combine roles with their permissions
      const rolesWithPermissions = (rolesData || []).map(role => ({
        ...role,
        permissions: rolePermissions
          ?.filter(rp => rp.role_id === role.id)
          ?.map(rp => rp.system_permissions)
          ?.filter(Boolean) || []
      }));

      setRoles(rolesWithPermissions);
    } catch (error) {
      console.error('Error fetching roles with permissions:', error);
      toast.error('Failed to load roles');
    }
  };

  // Fetch user role assignments
  const fetchUserRoleAssignments = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          *,
          user_roles!inner (
            tenant_id
          )
        `)
        .eq('user_roles.tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      setUserRoleAssignments(data || []);
    } catch (error) {
      console.error('Error fetching user role assignments:', error);
      toast.error('Failed to load user assignments');
    }
  };

  // Check if user has specific permission
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;

    // Get user's roles
    const userAssignments = userRoleAssignments.filter(ua => ua.user_id === user.id);
    if (userAssignments.length === 0) return false;

    // Check if any of user's roles has the permission
    for (const assignment of userAssignments) {
      const role = roles.find(r => r.id === assignment.role_id);
      if (role) {
        const hasPermission = role.permissions.some(p => 
          p.resource === resource && p.action === action
        );
        if (hasPermission) return true;
      }
    }

    return false;
  };

  // Check if user has any permission for a resource
  const hasResourceAccess = (resource: string): boolean => {
    if (!user) return false;

    const userAssignments = userRoleAssignments.filter(ua => ua.user_id === user.id);
    if (userAssignments.length === 0) return false;

    for (const assignment of userAssignments) {
      const role = roles.find(r => r.id === assignment.role_id);
      if (role) {
        const hasAccess = role.permissions.some(p => p.resource === resource);
        if (hasAccess) return true;
      }
    }

    return false;
  };

  // Get user's permissions
  const getUserPermissions = (): SystemPermission[] => {
    if (!user) return [];

    const userAssignments = userRoleAssignments.filter(ua => ua.user_id === user.id);
    const allPermissions: SystemPermission[] = [];

    userAssignments.forEach(assignment => {
      const role = roles.find(r => r.id === assignment.role_id);
      if (role) {
        allPermissions.push(...role.permissions);
      }
    });

    // Remove duplicates
    return allPermissions.filter((permission, index, self) =>
      index === self.findIndex(p => p.id === permission.id)
    );
  };

  // Assign role to user
  const assignRoleToUser = async (userId: string, roleId: string): Promise<boolean> => {
    if (!tenantId) return false;
    
    try {
      const { error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: user?.id || '',
          is_active: true
        });

      if (error) throw error;

      await fetchUserRoleAssignments();
      toast.success('Role assigned successfully');
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
      return false;
    }
  };

  // Remove role from user
  const removeRoleFromUser = async (userId: string, roleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_role_assignments')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;

      await fetchUserRoleAssignments();
      toast.success('Role removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
      return false;
    }
  };

  // Get user's roles
  const getUserRoles = (userId: string): EnhancedUserRole[] => {
    const userAssignments = userRoleAssignments.filter(ua => ua.user_id === userId);
    return userAssignments.map(assignment => 
      roles.find(r => r.id === assignment.role_id)
    ).filter(Boolean) as EnhancedUserRole[];
  };

  // Create permission groups for better organization
  const getPermissionGroups = () => {
    const groups = permissions.reduce((acc, permission) => {
      const key = `${permission.category}-${permission.resource}`;
      if (!acc[key]) {
        acc[key] = {
          category: permission.category,
          resource: permission.resource,
          permissions: []
        };
      }
      acc[key].permissions.push(permission);
      return acc;
    }, {} as Record<string, { category: string; resource: string; permissions: SystemPermission[] }>);

    return Object.values(groups);
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPermissions(),
        fetchRolesWithPermissions(),
        fetchUserRoleAssignments()
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
    roles,
    permissions,
    userRoleAssignments,
    loading,

    // Permission checks
    hasPermission,
    hasResourceAccess,
    getUserPermissions,
    getUserRoles,
    getPermissionGroups,

    // Actions
    assignRoleToUser,
    removeRoleFromUser,

    // Refresh functions
    loadAllData,
    fetchPermissions,
    fetchRolesWithPermissions,
    fetchUserRoleAssignments
  };
};