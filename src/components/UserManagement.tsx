import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Users, Shield, Edit, Trash2, Eye, Plus, Settings, Activity, Clock, AlertTriangle, Ban, CheckCircle, XCircle, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  tenant_id: string;
  created_at: string;
  avatar_url?: string;
  is_active?: boolean;
  last_login?: string;
  invitation_status?: string;
  invited_at?: string;
  invitation_accepted_at?: string;
}

interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: any;
  is_system_role: boolean;
  is_active: boolean;
  is_editable: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  color?: string;
  level?: number;
}

interface SystemPermission {
  id: string;
  resource: string;
  action: string;
  name: string;
  description: string;
  category: string;
  is_critical: boolean;
}

interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted: boolean;
  permission?: SystemPermission;
}

interface UserActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_name?: string;
}

interface UserSession {
  id: string;
  user_id: string;
  device_info?: any;
  ip_address?: string;
  last_activity: string;
  is_active: boolean;
  created_at: string;
  user_name?: string;
}

const PERMISSION_CATEGORIES = [
  'dashboard',
  'inventory',
  'sales',
  'customers',
  'products',
  'financial',
  'reports',
  'administration',
  'settings',
  'marketing',
  'pos',
  'communication'
];

const UserManagement = () => {
  const { tenantId, userRole, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [systemPermissions, setSystemPermissions] = useState<SystemPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Dialog states
  const [isViewingUser, setIsViewingUser] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  // Role creation/editing states
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState('{}');
  const [newRoleColor, setNewRoleColor] = useState('#2563eb');
  const [customRolePermissions, setCustomRolePermissions] = useState<any>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // User creation states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createUserError, setCreateUserError] = useState<{ message: string; details?: string; code?: string } | null>(null);

  // Resend invitation dialog state
  const [resendOpen, setResendOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendTarget, setResendTarget] = useState<User | null>(null);
  useEffect(() => {
    if (tenantId) {
      fetchUsers();
      fetchRoles();
      fetchSystemPermissions();
      fetchActivityLogs();
      fetchUserSessions();
    }
  }, [tenantId]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, role, tenant_id, created_at, avatar_url, invitation_status, invited_at, invitation_accepted_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const fetchSystemPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('system_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('resource', { ascending: true })
        .order('action', { ascending: true });

      if (error) throw error;
      setSystemPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          permission:system_permissions(*)
        `);

      if (error) throw error;
      setRolePermissions(data || []);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      // First fetch activity logs
      const { data: logs, error: logsError } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Then fetch user profiles to map user_id to names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);

      if (profilesError) throw profilesError;

      // Create a map of user_id to full_name
      const userNameMap = profiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile.full_name;
        return acc;
      }, {} as Record<string, string>);

      // Map logs with user names
      setActivityLogs((logs || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string,
        user_name: userNameMap[log.user_id] || 'Unknown User'
      })));
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchUserSessions = async () => {
    try {
      // First fetch user sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Then fetch user profiles to map user_id to names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);

      if (profilesError) throw profilesError;

      // Create a map of user_id to full_name
      const userNameMap = profiles.reduce((acc, profile) => {
        acc[profile.user_id] = profile.full_name;
        return acc;
      }, {} as Record<string, string>);

      // Map sessions with user names
      setUserSessions((sessions || []).map(session => ({
        ...session,
        ip_address: session.ip_address as string,
        user_name: userNameMap[session.user_id] || 'Unknown User'
      })));
    } catch (error) {
      console.error('Error fetching user sessions:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('tenant_users')
        .update({ is_active: !isActive })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast.success(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_users')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast.success('User removed successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert([
          {
            name: newRoleName,
            description: newRoleDescription,
            permissions: customRolePermissions,
            color: newRoleColor,
            tenant_id: tenantId,
            is_system_role: false,
            is_editable: true,
            is_active: true,
            created_by: user?.id
          }
        ])
        .select();

      if (error) throw error;

      toast.success('Role created successfully');
      setIsCreatingRole(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePermissions('{}');
      setNewRoleColor('#2563eb');
      setCustomRolePermissions({});
      setSelectedPermissions([]);
      fetchRoles();
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async () => {
    if (!selectedRole) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          name: newRoleName,
          description: newRoleDescription
        })
        .eq('id', selectedRole.id);

      if (error) throw error;

      // Update permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRole.id);

      if (selectedPermissions.length > 0) {
        const permissionInserts = selectedPermissions.map(permissionId => ({
          role_id: selectedRole.id,
          permission_id: permissionId,
          granted: true
        }));

        const { error: permissionError } = await supabase
          .from('role_permissions')
          .insert(permissionInserts);

        if (permissionError) throw permissionError;
      }

      toast.success('Role updated successfully');
      setSelectedRole(null);
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissions([]);
      setIsEditingRole(false);
      fetchRoles();
      fetchRolePermissions();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const createUser = async () => {
    if (!newUserEmail || !newUserRole || !newUserFullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    setCreateUserError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: newUserEmail,
          fullName: newUserFullName,
          role: newUserRole,
          tenantId
        }
      });

      if (error) throw error;

      // Show success message based on the response
      const successMessage = data?.message || 'User invitation sent successfully';
      toast.success(successMessage);
      
      setNewUserEmail('');
      setNewUserRole('');
      setNewUserFullName('');
      setIsCreatingUser(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Extract detailed error message from edge function response
      let errorMessage = 'Failed to create user';
      let errorDetails = '';
      let errorCode: string | undefined;
      
      try {
        // Handle FunctionsHttpError specifically
        if (error.name === 'FunctionsHttpError') {
          // Try to parse the error response
          const errorText = await error.context?.response?.text?.() || '';
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
              errorDetails = errorJson.details || '';
              errorCode = errorJson.code || errorJson.error?.code || errorCode;
            } catch {
              errorMessage = errorText;
            }
          }
        } else if (error?.message) {
          errorMessage = error.message;
          errorCode = (error.code || error.status || error.statusCode || '').toString();
        } else if (error?.error?.message) {
          errorMessage = error.error.message;
          errorCode = error.error.code;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } catch (parseError) {
        console.error('Error parsing edge function error:', parseError);
      }
      
      // Set error state for dialog and show detailed error in toast
      setCreateUserError({ message: errorMessage, details: errorDetails, code: errorCode });
      toast.error(`Failed to create user: ${errorMessage}`, {
        duration: 10000, // Show for 10 seconds
        description: errorDetails || (errorCode ? `Code: ${errorCode}` : 'Please check the console for more details')
      });
    } finally {
      setCreating(false);
    }
  };

  // Open resend invitation dialog and try to prefill last used email
  const openResendDialog = async (target: User) => {
    setResendTarget(target);
    setResendEmail('');
    setResendOpen(true);

    // Prefill with last invitation recipient if available
    try {
      const { data } = await supabase
        .from('communication_logs')
        .select('recipient')
        .eq('tenant_id', tenantId)
        .eq('user_id', target.user_id)
        .eq('type', 'user_invitation')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.recipient) setResendEmail(data.recipient);
    } catch (e) {
      // no-op
    }
  };

  const resendInvitationConfirm = async () => {
    if (!resendTarget || !resendEmail) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: resendEmail,
          fullName: resendTarget.full_name,
          role: resendTarget.role,
          tenantId
        }
      });
      if (error) throw error;
      toast.success(data?.message || 'Invitation email resent');
      setResendOpen(false);
      setResendTarget(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend invitation');
    } finally {
      setResending(false);
    }
  };

  const deactivateUserSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('User session deactivated');
      fetchUserSessions();
    } catch (error) {
      toast.error('Failed to deactivate session');
    }
  };

  const getRoleDisplayInfo = (role: string) => {
    // Find the role in our dynamic roles list to get color and icon
    const dynamicRole = roles.find(r => r.name === role);
    
    if (dynamicRole) {
      // Use dynamic role color or default colors based on role level/type
      const defaultColors = ['bg-red-100 text-red-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800'];
      const colorIndex = Math.abs(role.length) % defaultColors.length;
      const color = defaultColors[colorIndex];
      
      return { 
        color, 
        icon: <Shield className="w-3 h-3" /> 
      };
    }
    
    // Fallback for any roles not in our dynamic list
    return { color: 'bg-gray-100 text-gray-800', icon: <Users className="w-3 h-3" /> };
  };


  const openEditRole = (role: UserRole) => {
    setSelectedRole(role);
    setNewRoleName(role.name);
    setNewRoleDescription(role.description);
    
    // Get permissions for this role
    const rolePerms = rolePermissions.filter(rp => rp.role_id === role.id && rp.granted);
    setSelectedPermissions(rolePerms.map(rp => rp.permission_id));
    setIsEditingRole(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    // Only set loading to false when all critical data is loaded
    if (users.length >= 0 && roles.length >= 0 && systemPermissions.length >= 0) {
      setLoading(false);
    }
  }, [users, roles, systemPermissions]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your team members and their roles</CardDescription>
                </div>
                {userRole === 'admin' && (
                  <Dialog open={isCreatingUser} onOpenChange={setIsCreatingUser}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        // Reset all form states when opening dialog
                        setNewUserEmail('');
                        setNewUserRole('');
                        setNewUserFullName('');
                        setCreating(false);
                        setCreateUserError(null);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account and send them an email invitation
                        </DialogDescription>
                      </DialogHeader>
                      {createUserError && (
                        <Alert variant="destructive">
                          <AlertTitle>{createUserError.message || 'Invitation failed'}</AlertTitle>
                          <AlertDescription>
                            <div className="mt-1 text-xs whitespace-pre-wrap break-words">
                              {createUserError.details || (createUserError.code ? `Code: ${createUserError.code}` : 'No further details provided.')}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="user-full-name">Full Name</Label>
                          <Input
                            id="user-full-name"
                            value={newUserFullName}
                            onChange={(e) => setNewUserFullName(e.target.value)}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="user-email">Email Address</Label>
                          <Input
                            id="user-email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> The user will receive an email invitation with a secure link to set their password and verify their account.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="user-role">Role</Label>
                          <Select value={newUserRole} onValueChange={setNewUserRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.length === 0 ? (
                                <SelectItem value="" disabled>
                                  No roles available - Create a role first
                                </SelectItem>
                              ) : (
                                roles.map((role) => (
                                  <SelectItem key={role.id} value={role.name}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: role.color || '#6b7280' }}
                                      />
                                      {role.name}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                         <div className="flex justify-end gap-2">
                           <Button 
                             variant="outline" 
                             onClick={() => {
                               setIsCreatingUser(false);
                               // Reset form state when canceling
                               setNewUserEmail('');
                               setNewUserRole('');
                               setNewUserFullName('');
                               setCreating(false);
                             }}
                           >
                             Cancel
                           </Button>
                           <Button onClick={createUser} disabled={creating}>
                             {creating ? 'Creating...' : 'Create User'}
                           </Button>
                         </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invitation Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const roleInfo = getRoleDisplayInfo(user.role);
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  {user.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium">{user.full_name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={roleInfo.color}>
                                <div className="flex items-center gap-1">
                                  {roleInfo.icon}
                                  {user.role}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.invitation_status && (
                                <Badge 
                                  variant={
                                    user.invitation_status === 'accepted' ? 'default' :
                                    user.invitation_status === 'pending' ? 'secondary' :
                                    user.invitation_status === 'expired' ? 'destructive' : 
                                    'outline'
                                  }
                                >
                                  {user.invitation_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                  {user.invitation_status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {user.invitation_status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                                  {user.invitation_status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.is_active !== false ? "default" : "secondary"}>
                                {user.is_active !== false ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsViewingUser(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {user.invitation_status !== 'accepted' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openResendDialog(user)}
                                    disabled={resending && resendTarget?.user_id === user.user_id}
                                    title="Resend invitation"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                )}
                                {userRole === 'admin' && (
                                  <>
                                    <Select
                                      value={user.role}
                                      onValueChange={(newRole) => updateUserRole(user.user_id, newRole)}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roles.map((role) => (
                                          <SelectItem key={role.id} value={role.name}>
                                            {role.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleUserStatus(user.user_id, user.is_active !== false)}
                                    >
                                      {user.is_active !== false ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteUser(user.user_id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roles & Permissions</CardTitle>
                  <CardDescription>Manage user roles and their permissions</CardDescription>
                </div>
                <Dialog open={isEditingRole} onOpenChange={setIsEditingRole}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setSelectedRole(null);
                      setNewRoleName('');
                      setNewRoleDescription('');
                      setSelectedPermissions([]);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedRole ? 'Edit Role' : 'Create New Role'}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedRole ? 'Update role details and permissions' : 'Create a new role with custom permissions'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="role-name">Role Name</Label>
                          <Input
                            id="role-name"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="Enter role name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role-description">Description</Label>
                          <Input
                            id="role-description"
                            value={newRoleDescription}
                            onChange={(e) => setNewRoleDescription(e.target.value)}
                            placeholder="Enter role description"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Permissions</Label>
                        <div className="mt-2 space-y-4">
                          {PERMISSION_CATEGORIES.map(category => {
                            const categoryPermissions = systemPermissions.filter(p => p.category === category);
                            if (categoryPermissions.length === 0) return null;

                            return (
                              <div key={category} className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2 capitalize">{category}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {categoryPermissions.map(permission => (
                                    <div key={permission.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={permission.id}
                                        checked={selectedPermissions.includes(permission.id)}
                                        onCheckedChange={() => togglePermission(permission.id)}
                                      />
                                      <Label
                                        htmlFor={permission.id}
                                        className="text-sm font-normal cursor-pointer"
                                      >
                                        {permission.name}
                                        {permission.is_critical && (
                                          <AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" />
                                        )}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditingRole(false)}>
                          Cancel
                        </Button>
                        <Button onClick={selectedRole ? updateRole : createRole}>
                          {selectedRole ? 'Update Role' : 'Create Role'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {roles.map((role) => (
                  <div key={role.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{role.name}</h4>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={role.is_system_role ? "secondary" : "default"}>
                            {role.is_system_role ? 'System Role' : 'Custom Role'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Created {new Date(role.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditRole(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!role.is_system_role && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteRole(role.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Monitor user activities and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No activity logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.user_name || 'Unknown User'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action_type}</Badge>
                          </TableCell>
                          <TableCell>{log.resource_type || '-'}</TableCell>
                          <TableCell>
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>{log.ip_address || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active User Sessions</CardTitle>
              <CardDescription>Monitor and manage active user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No active sessions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      userSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{session.user_name || 'Unknown User'}</TableCell>
                          <TableCell>
                            {session.device_info?.browser || 'Unknown Device'}
                          </TableCell>
                          <TableCell>{session.ip_address || '-'}</TableCell>
                          <TableCell>
                            {new Date(session.last_activity).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.is_active ? "default" : "secondary"}>
                              {session.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {session.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deactivateUserSession(session.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={isViewingUser} onOpenChange={setIsViewingUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  {selectedUser.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium">{selectedUser.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.role}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.user_id}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.role}</p>
                </div>
                <div>
                  <Label>Invitation Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.invitation_status || 'N/A'}
                    {selectedUser.invited_at && (
                      <span className="block text-xs">
                        Invited: {new Date(selectedUser.invited_at).toLocaleString()}
                      </span>
                    )}
                    {selectedUser.invitation_accepted_at && (
                      <span className="block text-xs">
                        Accepted: {new Date(selectedUser.invitation_accepted_at).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <Label>Joined Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.is_active !== false ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resend Invitation Dialog */}
      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend Invitation</DialogTitle>
            <DialogDescription>
              Send a fresh invitation link to set password and join this tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resend-email">Recipient Email</Label>
              <Input
                id="resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResendOpen(false)}>Cancel</Button>
              <Button onClick={resendInvitationConfirm} disabled={resending || !resendEmail}>
                {resending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;