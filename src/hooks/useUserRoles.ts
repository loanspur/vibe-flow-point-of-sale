import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionError } from '@/hooks/usePermissionError';

interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: any; // Use any to handle JSON type from Supabase
  level: number;
  color: string;
}

export const useUserRoles = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, tenantId } = useAuth();
  const { handleSupabaseError } = usePermissionError({ showToast: false });

  const fetchRoles = async () => {
    console.log('🔄 useUserRoles: fetchRoles called', { tenantId, userId: user?.id });
    
    if (!tenantId) {
      console.log('❌ useUserRoles: No tenantId, skipping role fetch');
      setLoading(false);
      return;
    }

    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('level', { ascending: true });

      if (error) throw error;
      setRoles(rolesData || []);

      // Get current user's role by checking tenant_users table
      if (user) {
        console.log('🔍 useUserRoles: Fetching user role from tenant_users');
        const { data: tenantUserData, error: tenantUserError } = await supabase
          .from('tenant_users')
          .select('role')
          .eq('tenant_id', tenantId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        console.log('🔍 useUserRoles: tenant_users result:', { tenantUserData, tenantUserError });

        if (tenantUserData?.role) {
          // Find the role details from our roles data
          const roleDetails = rolesData?.find(role => 
            role.name.toLowerCase().includes(tenantUserData.role.toLowerCase()) ||
            tenantUserData.role === 'admin' && role.name === 'Business Owner' ||
            tenantUserData.role === 'manager' && role.name === 'Store Manager' ||
            tenantUserData.role === 'user' && role.name === 'Sales Staff'
          );

          if (roleDetails) {
            setUserRole(roleDetails);
          } else {
            // Fallback: create a basic role object
            setUserRole({
              id: 'fallback',
              name: tenantUserData.role,
              description: `${tenantUserData.role} role`,
              permissions: {},
              level: 3,
              color: '#6366f1'
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      handleSupabaseError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [tenantId, user]);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!userRole?.permissions) return false;
    
    // Check for 'all' permission (super admin)
    if (userRole.permissions.all === true) return true;
    
    // Check specific resource permission
    const resourcePerms = userRole.permissions[resource];
    if (!resourcePerms) return false;
    
    return resourcePerms[action] === true;
  };

  const canAccess = (requiredRoles: string[]): boolean => {
    if (!userRole) return false;
    
    // For roles with 'all' permissions, allow access to everything
    if (userRole.permissions?.all === true) return true;
    
    // Check if user's role is in the required roles list
    return requiredRoles.includes(userRole.name);
  };

  return {
    roles,
    userRole,
    loading,
    hasPermission,
    canAccess,
    refreshRoles: fetchRoles
  };
};