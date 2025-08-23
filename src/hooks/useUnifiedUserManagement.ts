import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Unified interfaces
export interface UnifiedUser {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  role: string;
  roles: string[];
  tenant_id: string;
  created_at: string;
  last_login?: string;
  status: 'active' | 'inactive' | 'pending' | 'invited';
  invitation_status: 'accepted' | 'pending' | 'expired';
  invited_at?: string;
  avatar_url?: string;
}

export interface UnifiedRole {
  id: string;
  name: string;
  description: string;
  permissions: SystemPermission[];
  level: number;
  color: string;
  is_active: boolean;
  is_editable: boolean;
  tenant_id: string;
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

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  user_name: string;
  device_info?: any;
  ip_address?: string;
  last_activity: string;
  is_active: boolean;
  created_at: string;
}

export const useUnifiedUserManagement = () => {
  const { user, tenantId, userRole } = useAuth();
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [roles, setRoles] = useState<UnifiedRole[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchPermissions(),
        fetchActivityLogs(),
        fetchUserSessions(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch users with unified status handling
  const fetchUsers = async () => {
    if (!tenantId) return;

    try {
      // Use the enhanced RPC function for better data fetching
      const { data: usersData, error } = await supabase.rpc('get_tenant_users_with_roles', {
        p_tenant_id: tenantId,
        p_limit: 100,
        p_offset: 0
      });

      if (!error && usersData && usersData.length > 0) {
        const mappedUsers: UnifiedUser[] = usersData.map((userData: any) => ({
          id: userData.user_id,
          user_id: userData.user_id,
          full_name: userData.full_name || userData.email || 'Unknown User',
          email: userData.email,
          role: userData.primary_role || 'user',
          roles: userData.role_names || [userData.primary_role || 'user'],
          tenant_id: tenantId!,
          created_at: userData.created_at,
          last_login: userData.last_sign_in_at,
          status: userData.status === 'active' ? 'active' : userData.invited ? 'pending' : 'inactive',
          invitation_status: userData.invited ? 'pending' : 'accepted',
          invited_at: userData.created_at,
        }));
        
        setUsers(mappedUsers);
        return;
      }

      // Fallback method A: tenant_users table
      const { data: tenantUsers, error: tuError } = await supabase
        .from('tenant_users')
        .select(`
          user_id, 
          role, 
          tenant_id, 
          is_active, 
          invited_at, 
          created_at, 
          invitation_status
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (tuError) throw tuError;

      const userIds = tenantUsers?.map(tu => tu.user_id).filter(Boolean) || [];

      // Fetch profiles and auth data
      const [profilesResult, emailsResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', userIds),
        supabase.rpc('get_tenant_user_emails', { tenant_id: tenantId }),
        supabase.from('user_role_assignments')
          .select(`
            user_id,
            role_id,
            is_active,
            user_roles!inner(id, name, level)
          `)
          .in('user_id', userIds)
          .eq('is_active', true)
          .eq('tenant_id', tenantId)
      ]);

      const profiles = profilesResult.data || [];
        const emails = emailsResult.data || [];
        const roleAssignments = rolesResult.data || [];

        // Create maps for efficient lookups
        const profileMap = new Map(profiles.map(p => [p.user_id, p]));
        const emailMap = new Map(emails.map(e => [e.user_id, e as any]));
      const userRolesMap = new Map<string, any[]>();
      
      roleAssignments.forEach(ra => {
        if (!userRolesMap.has(ra.user_id)) {
          userRolesMap.set(ra.user_id, []);
        }
        userRolesMap.get(ra.user_id)?.push(ra.user_roles);
      });

      // Combine all data with unified status handling
      const combined: UnifiedUser[] = (tenantUsers || []).map(tu => {
        const profile = profileMap.get(tu.user_id);
        const emailInfo = emailMap.get(tu.user_id);
        const userRoles = userRolesMap.get(tu.user_id) || [];
        const primaryRole = userRoles.sort((a, b) => (a.level || 999) - (b.level || 999))[0];

        // Unified status logic
        let status: 'active' | 'inactive' | 'pending' | 'invited';
        let invitationStatus: 'accepted' | 'pending' | 'expired';

        if (!tu.is_active) {
          status = 'inactive';
          invitationStatus = 'expired';
        } else if (tu.invitation_status === 'pending' || (tu.invited_at && !profile?.invitation_accepted_at)) {
          status = 'pending';
          invitationStatus = 'pending';
        } else {
          status = 'active';
          invitationStatus = 'accepted';
        }

        return {
          id: profile?.id || tu.user_id,
          user_id: tu.user_id,
          full_name: profile?.full_name || emailInfo?.email || 'Unknown User',
          email: emailInfo?.email,
          role: primaryRole?.name || tu.role || 'user',
          roles: userRoles.map(r => r.name),
          tenant_id: tu.tenant_id,
          created_at: profile?.created_at || tu.created_at,
          last_login: (emailInfo as any)?.last_sign_in_at,
          status,
          invitation_status: invitationStatus,
          invited_at: tu.invited_at || profile?.invited_at,
          avatar_url: profile?.avatar_url,
        };
      });

      setUsers(combined);
      if ((tenantUsers || []).length > 0) return;

      // Fallback method B: profiles-only (covers cases where tenant_users is not populated)
      const { data: tenantProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, created_at, role')
        .eq('tenant_id', tenantId);

      if (profErr) throw profErr;

      // Map emails via helper RPC if available
      const { data: emailMapData } = await supabase.rpc('get_tenant_user_emails', { tenant_id: tenantId });
      const fallbackEmailMap = new Map((emailMapData || []).map((e: any) => [e.user_id, e.email]));

      const profilesCombined: UnifiedUser[] = (tenantProfiles || []).map(p => ({
        id: p.user_id,
        user_id: p.user_id,
        full_name: p.full_name || fallbackEmailMap.get(p.user_id) || 'Unknown User',
        email: fallbackEmailMap.get(p.user_id),
        role: p.role || 'user',
        roles: [p.role || 'user'],
        tenant_id: tenantId!,
        created_at: p.created_at,
        status: 'active',
        invitation_status: 'accepted'
      }));

      if (profilesCombined.length > 0) {
        setUsers(profilesCombined);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  // Fetch roles with permissions
  const fetchRoles = async () => {
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

      // Combine roles with permissions
      const rolesWithPermissions: UnifiedRole[] = (rolesData || []).map(role => ({
        ...role,
        permissions: rolePermissions
          ?.filter(rp => rp.role_id === role.id && rp.system_permissions)
          ?.map(rp => rp.system_permissions) || []
      }));

      setRoles(rolesWithPermissions);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    }
  };

  // Fetch system permissions
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

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    if (!tenantId) return;

    try {
      const { data: logs, error: logsError } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      // Fetch user names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);

      if (profilesError) throw profilesError;

      const userNameMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile.full_name;
        return acc;
      }, {} as Record<string, string>);

      const mappedLogs: ActivityLog[] = (logs || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string,
        user_agent: log.user_agent as string,
        user_name: userNameMap[log.user_id] || 'Unknown User'
      }));

      setActivityLogs(mappedLogs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  // Fetch user sessions
  const fetchUserSessions = async () => {
    if (!tenantId) return;

    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })
        .limit(50);

      if (sessionsError) throw sessionsError;

      // Fetch user names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);

      if (profilesError) throw profilesError;

      const userNameMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile.full_name;
        return acc;
      }, {} as Record<string, string>);

      const mappedSessions: UserSession[] = (sessions || []).map(session => ({
        ...session,
        ip_address: session.ip_address as string,
        device_info: session.device_info as any,
        user_name: userNameMap[session.user_id] || 'Unknown User'
      }));

      setUserSessions(mappedSessions);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
    }
  };

  // User management actions
  const inviteUser = async (email: string, roleId: string, fullName?: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email,
          roleId,
          fullName,
          tenantId,
        }
      });

      if (error) throw error;
      
      toast.success('User invitation sent successfully');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to send invitation');
      return false;
    }
  };

  const updateUserRole = async (userId: string, roleId: string) => {
    try {
      // Deactivate existing assignments
      await supabase
        .from('user_role_assignments')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      // Create new assignment
      const { error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: user?.id,
          is_active: true
        });

      if (error) throw error;
      
      toast.success('User role updated successfully');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
      return false;
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_users')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      toast.success('User deactivated successfully');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user');
      return false;
    }
  };

  const activateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_users')
        .update({ is_active: true })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      toast.success('User activated successfully');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
      return false;
    }
  };

  const resendInvitation = async (email: string, roleId: string, fullName?: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email,
          roleId,
          fullName,
          tenantId,
          isResend: true
        }
      });

      if (error) throw error;
      
      toast.success('Invitation resent successfully');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
      return false;
    }
  };

  const updateUserProfile = async (userId: string, profileData: { full_name?: string; email?: string }) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('User profile updated successfully');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      toast.error('Failed to update user profile');
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // First deactivate the user
      const { error: deactivateError } = await supabase
        .from('tenant_users')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (deactivateError) throw deactivateError;

      // Deactivate role assignments
      const { error: roleError } = await supabase
        .from('user_role_assignments')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (roleError) throw roleError;
      
      toast.success('User deleted successfully');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
      return false;
    }
  };

  // Role management actions
  const createRole = async (roleData: {
    name: string;
    description: string;
    level: number;
    color: string;
    permissions: string[];
  }) => {
    try {
      // Create role
      const { data: roleResult, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          tenant_id: tenantId,
          name: roleData.name,
          description: roleData.description,
          level: roleData.level,
          color: roleData.color,
          is_active: true,
          is_editable: true,
          created_by: user?.id
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Add permissions
      if (roleData.permissions.length > 0) {
        const permissionInserts = roleData.permissions.map(permissionId => ({
          role_id: roleResult.id,
          permission_id: permissionId,
          granted: true
        }));

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(permissionInserts);

        if (permError) throw permError;
      }

      toast.success('Role created successfully');
      await fetchRoles();
      return true;
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
      return false;
    }
  };

  const updateRole = async (roleId: string, roleData: {
    name?: string;
    description?: string;
    level?: number;
    color?: string;
    permissions?: string[];
  }) => {
    try {
      // Update role
      if (roleData.name || roleData.description || roleData.level !== undefined || roleData.color) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({
            name: roleData.name,
            description: roleData.description,
            level: roleData.level,
            color: roleData.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', roleId);

        if (roleError) throw roleError;
      }

      // Update permissions if provided
      if (roleData.permissions) {
        // Remove existing permissions
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId);

        // Add new permissions
        if (roleData.permissions.length > 0) {
          const permissionInserts = roleData.permissions.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId,
            granted: true
          }));

          const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permissionInserts);

          if (permError) throw permError;
        }
      }

      toast.success('Role updated successfully');
      await fetchRoles();
      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
      return false;
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      // Check if role is in use
      const { data: assignments, error: checkError } = await supabase
        .from('user_role_assignments')
        .select('id')
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (checkError) throw checkError;

      if (assignments && assignments.length > 0) {
        toast.error('Cannot delete role that is assigned to users');
        return false;
      }

      // Delete role permissions first
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Delete role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (roleError) throw roleError;

      toast.success('Role deleted successfully');
      await fetchRoles();
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
      return false;
    }
  };

  // Permission checking
  const normalizeRole = (role?: string) => {
    if (!role) return role;
    const map: Record<string, string> = {
      'Administrator': 'admin',
      'Business Owner': 'admin'
    };
    return map[role] || role;
  };

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!user || !tenantId) return false;
    
    // Super admins have all permissions
    if (normalizeRole(userRole) === 'superadmin') return true;
    
    // Find user's roles and check permissions
    const currentUser = users.find(u => u.user_id === user.id);
    if (!currentUser) return false;

    const userRoles = roles.filter(role => 
      currentUser.roles.map(normalizeRole).includes(normalizeRole(role.name))
    );

    return userRoles.some(role => 
      role.permissions.some(perm => 
        perm.resource === resource && perm.action === action
      )
    );
  }, [user, tenantId, userRole, users, roles]);

  const hasRoleAccess = useCallback((requiredRoles: string[]): boolean => {
    if (!user || !tenantId) {
      console.log('hasRoleAccess: Missing user or tenantId', { user: !!user, tenantId });
      return false;
    }
    
    // Superadmin has access to everything
    if (normalizeRole(userRole) === 'superadmin') {
      console.log('hasRoleAccess: User is superadmin');
      return true;
    }
    
    // Tenant admin has access to everything within their tenant
    if (['admin'].includes(normalizeRole(userRole))) {
      console.log('hasRoleAccess: User is tenant admin');
      return true;
    }
    
    // First try to use the current user from the users list (complex role system)
    const currentUser = users.find(u => u.user_id === user.id);
    console.log('hasRoleAccess: Current user lookup', { 
      userId: user.id, 
      currentUser: !!currentUser,
      userRole,
      requiredRoles,
      userRoles: currentUser?.roles,
      primaryRole: currentUser?.role 
    });
    
    if (currentUser) {
      const hasAccess = requiredRoles.some(role => 
        currentUser.roles.map(normalizeRole).includes(normalizeRole(role)) || normalizeRole(currentUser.role) === normalizeRole(role)
      );
      console.log('hasRoleAccess: Access result from user list', { hasAccess, requiredRoles });
      return hasAccess;
    }
    
    // Fallback to AuthContext userRole (simple role system)
    console.log('hasRoleAccess: Using fallback to AuthContext userRole', { userRole, requiredRoles });
    const fallbackAccess = userRole ? requiredRoles.map(normalizeRole).includes(normalizeRole(userRole)) : false;
    console.log('hasRoleAccess: Fallback access result', { fallbackAccess, userRole, requiredRoles });
    return fallbackAccess;
  }, [user, tenantId, userRole, users]);

  // Initialize data
  useEffect(() => {
    if (tenantId) {
      fetchAllData();
    }
  }, [tenantId, fetchAllData]);

  return {
    // Data
    users,
    roles,
    permissions,
    activityLogs,
    userSessions,
    loading,
    
    // Actions
    fetchAllData,
    inviteUser,
    updateUserRole,
    deactivateUser,
    activateUser,
    resendInvitation,
    updateUserProfile,
    deleteUser,
    createRole,
    updateRole,
    deleteRole,
    
    // Permission checks
    hasPermission,
    hasRoleAccess,
  };
};