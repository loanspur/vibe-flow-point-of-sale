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
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Edit, Trash2, Eye, Plus, Settings, Activity, Mail, Clock, UserCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  role: string;
  tenant_id: string;
  created_at: string;
  avatar_url?: string;
}

interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: any;
  is_system_role: boolean;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
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

interface UserInvitation {
  id: string;
  email: string;
  role_id: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
  role_name?: string;
  invited_by_name?: string;
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

interface Permission {
  resource: string;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

const DEFAULT_RESOURCES = [
  'products',
  'sales',
  'customers',
  'quotes',
  'reports',
  'business_settings',
  'user_management',
  'accounting',
  'inventory',
  'contacts'
];

const UserManagement = () => {
  const { tenantId, userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');

  useEffect(() => {
    if (tenantId) {
      fetchUsers();
      fetchRoles();
      fetchActivityLogs();
      fetchInvitations();
      fetchUserSessions();
    }
  }, [tenantId]);

  useEffect(() => {
    initializePermissions();
  }, []);

  const initializePermissions = () => {
    const permissions: Permission[] = DEFAULT_RESOURCES.map(resource => ({
      resource,
      actions: {
        create: false,
        read: false,
        update: false,
        delete: false
      }
    }));
    setRolePermissions(permissions);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          role,
          tenant_id,
          created_at,
          avatar_url
        `)
        .eq('tenant_id', tenantId);

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
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      const permissions = rolePermissions.reduce((acc, perm) => {
        acc[perm.resource] = perm.actions;
        return acc;
      }, {} as Record<string, any>);

      const { error } = await supabase
        .from('user_roles')
        .insert({
          name: newRoleName,
          description: newRoleDescription,
          permissions,
          tenant_id: tenantId,
          is_system_role: false,
          is_active: true
        });

      if (error) throw error;

      toast.success('Role created successfully');
      setNewRoleName('');
      setNewRoleDescription('');
      setIsCreateRoleOpen(false);
      initializePermissions();
      fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Get user names separately to avoid relation issues
      const userIds = [...new Set(data?.map(log => log.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      const logsWithUserNames = data?.map(log => ({
        ...log,
        user_name: profileMap.get(log.user_id) || 'Unknown User',
        ip_address: log.ip_address as string || undefined,
        user_agent: log.user_agent as string || undefined
      })) || [];
      
      setActivityLogs(logsWithUserNames);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get role names and invited by names separately
      const roleIds = [...new Set(data?.map(inv => inv.role_id).filter(Boolean) || [])];
      const userIds = [...new Set(data?.map(inv => inv.invited_by) || [])];
      
      const [rolesData, profilesData] = await Promise.all([
        supabase.from('user_roles').select('id, name').in('id', roleIds),
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
      ]);

      const roleMap = new Map(rolesData.data?.map(r => [r.id, r.name]) || []);
      const profileMap = new Map(profilesData.data?.map(p => [p.user_id, p.full_name]) || []);
      
      const invitationsWithNames = data?.map(invitation => ({
        ...invitation,
        role_name: roleMap.get(invitation.role_id) || 'Unknown Role',
        invited_by_name: profileMap.get(invitation.invited_by) || 'Unknown User'
      })) || [];
      
      setInvitations(invitationsWithNames);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchUserSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      
      // Get user names separately
      const userIds = [...new Set(data?.map(session => session.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      const sessionsWithUserNames = data?.map(session => ({
        ...session,
        user_name: profileMap.get(session.user_id) || 'Unknown User',
        ip_address: session.ip_address as string || undefined
      })) || [];
      
      setUserSessions(sessionsWithUserNames);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
    }
  };

  const updateRole = async () => {
    if (!editingRole) return;

    try {
      const permissions = rolePermissions.reduce((acc, perm) => {
        acc[perm.resource] = perm.actions;
        return acc;
      }, {} as Record<string, any>);

      const { error } = await supabase
        .from('user_roles')
        .update({
          description: newRoleDescription,
          permissions
        })
        .eq('id', editingRole.id);

      if (error) throw error;

      toast.success('Role updated successfully');
      setEditingRole(null);
      setIsEditRoleOpen(false);
      fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const updateUserRole = async (userId: string, roleId: string) => {
    try {
      // First, deactivate existing role assignments
      await supabase
        .from('user_role_assignments')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      // Create new role assignment
      const { error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          is_active: true
        });

      if (error) throw error;

      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const updatePermission = (resourceIndex: number, action: keyof Permission['actions'], value: boolean) => {
    const updatedPermissions = [...rolePermissions];
    updatedPermissions[resourceIndex].actions[action] = value;
    setRolePermissions(updatedPermissions);
  };

  const openEditRole = (role: UserRole) => {
    setEditingRole(role);
    setNewRoleDescription(role.description || '');
    
    // Load existing permissions
    const permissions: Permission[] = DEFAULT_RESOURCES.map(resource => ({
      resource,
      actions: role.permissions?.[resource] || {
        create: false,
        read: false,
        update: false,
        delete: false
      }
    }));
    setRolePermissions(permissions);
    setIsEditRoleOpen(true);
  };

  const sendUserInvitation = async () => {
    if (!inviteEmail.trim() || !inviteRoleId) {
      toast.error('Email and role are required');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_user_invitation', {
        tenant_id_param: tenantId,
        email_param: inviteEmail,
        role_id_param: inviteRoleId,
        invited_by_param: 'current-user-id', // You'd get this from auth context
        expires_in_hours: 72
      });

      if (error) throw error;

      toast.success('User invitation sent successfully');
      setInviteEmail('');
      setInviteRoleId('');
      setIsInviteUserOpen(false);
      fetchInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ 
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation resent');
      fetchInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
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
      console.error('Error deactivating session:', error);
      toast.error('Failed to deactivate session');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, permissions, and security</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsInviteUserOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations
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
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users
              </CardTitle>
              <CardDescription>Manage user accounts and role assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[200px]">
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="font-medium">{user.full_name || 'Unnamed User'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(roleId) => updateUserRole(user.id, roleId)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles & Permissions
                </div>
                <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => initializePermissions()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>
                        Define a new role with specific permissions for your team
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="roleName">Role Name</Label>
                          <Input
                            id="roleName"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="e.g., Sales Manager"
                          />
                        </div>
                        <div>
                          <Label htmlFor="roleDescription">Description</Label>
                          <Input
                            id="roleDescription"
                            value={newRoleDescription}
                            onChange={(e) => setNewRoleDescription(e.target.value)}
                            placeholder="Brief description of the role"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-base font-medium">Permissions</Label>
                        <div className="mt-3 space-y-4 border rounded-lg p-4">
                          <div className="grid grid-cols-5 gap-4 items-center font-medium text-sm border-b pb-2">
                            <div>Resource</div>
                            <div className="text-center">Create</div>
                            <div className="text-center">Read</div>
                            <div className="text-center">Update</div>
                            <div className="text-center">Delete</div>
                          </div>
                          {rolePermissions.map((permission, index) => (
                            <div key={permission.resource} className="grid grid-cols-5 gap-4 items-center">
                              <div className="font-medium capitalize">{permission.resource.replace('_', ' ')}</div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.actions.create}
                                  onCheckedChange={(checked) => updatePermission(index, 'create', !!checked)}
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.actions.read}
                                  onCheckedChange={(checked) => updatePermission(index, 'read', !!checked)}
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.actions.update}
                                  onCheckedChange={(checked) => updatePermission(index, 'update', !!checked)}
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.actions.delete}
                                  onCheckedChange={(checked) => updatePermission(index, 'delete', !!checked)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={createRole}>Create Role</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>Manage roles and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <Badge variant={role.is_system_role ? "default" : "secondary"}>
                          {role.is_system_role ? 'System' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Role Dialog */}
          <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Role: {editingRole?.name}</DialogTitle>
                <DialogDescription>
                  Modify permissions for this role
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editRoleDescription">Description</Label>
                  <Input
                    id="editRoleDescription"
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="Brief description of the role"
                    disabled={editingRole?.is_system_role}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Permissions</Label>
                  <div className="mt-3 space-y-4 border rounded-lg p-4">
                    <div className="grid grid-cols-5 gap-4 items-center font-medium text-sm border-b pb-2">
                      <div>Resource</div>
                      <div className="text-center">Create</div>
                      <div className="text-center">Read</div>
                      <div className="text-center">Update</div>
                      <div className="text-center">Delete</div>
                    </div>
                    {rolePermissions.map((permission, index) => (
                      <div key={permission.resource} className="grid grid-cols-5 gap-4 items-center">
                        <div className="font-medium capitalize">{permission.resource.replace('_', ' ')}</div>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission.actions.create}
                            onCheckedChange={(checked) => updatePermission(index, 'create', !!checked)}
                            disabled={editingRole?.is_system_role}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission.actions.read}
                            onCheckedChange={(checked) => updatePermission(index, 'read', !!checked)}
                            disabled={editingRole?.is_system_role}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission.actions.update}
                            onCheckedChange={(checked) => updatePermission(index, 'update', !!checked)}
                            disabled={editingRole?.is_system_role}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission.actions.delete}
                            onCheckedChange={(checked) => updatePermission(index, 'delete', !!checked)}
                            disabled={editingRole?.is_system_role}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={updateRole} disabled={editingRole?.is_system_role}>
                    Update Role
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  User Invitations
                </div>
              </CardTitle>
              <CardDescription>Manage pending user invitations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{invitation.role_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          invitation.status === 'pending' ? 'default' :
                          invitation.status === 'accepted' ? 'secondary' : 'destructive'
                        }>
                          {invitation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{invitation.invited_by_name}</TableCell>
                      <TableCell>
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {invitation.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInvitation(invitation.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelInvitation(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                User Activity Logs
              </CardTitle>
              <CardDescription>Track user actions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action_type}</Badge>
                      </TableCell>
                      <TableCell>{log.resource_type || 'N/A'}</TableCell>
                      <TableCell>
                        {log.details ? (
                          <span className="text-sm text-muted-foreground">
                            {JSON.stringify(log.details).slice(0, 50)}...
                          </span>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Active User Sessions
              </CardTitle>
              <CardDescription>Monitor and manage active user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.user_name}</TableCell>
                      <TableCell>
                        {session.device_info?.browser || 'Unknown'} on {session.device_info?.os || 'Unknown'}
                      </TableCell>
                      <TableCell>{session.ip_address || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(session.last_activity).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivateUserSession(session.id)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviteUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendUserInvitation}>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;