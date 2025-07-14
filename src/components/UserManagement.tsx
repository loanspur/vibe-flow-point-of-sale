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
import { Users, UserPlus, Shield, Edit, Trash2, Eye, Plus, Settings } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchUsers();
      fetchRoles();
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
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
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
      </Tabs>
    </div>
  );
};

export default UserManagement;