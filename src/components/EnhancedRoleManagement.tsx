import React, { useState, useEffect } from 'react';
import { useRoleManagement, UserRole } from '@/hooks/useRoleManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Settings,
  Package,
  ShoppingCart,
  Contact,
  MessageSquare,
  BarChart3,
  Building,
  Save,
  CheckCircle2
} from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';

interface SystemPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  category: string;
  is_critical: boolean;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
  granted: boolean;
}

interface RoleFormData {
  id?: string;
  name: string;
  description: string;
  level: number;
  color: string;
  permissions: Record<string, boolean>;
}

const MODULE_ICONS = {
  inventory: Package,
  sales: ShoppingCart,
  purchasing: Package,
  crm: Contact,
  communication: MessageSquare,
  administration: Settings,
  reports: BarChart3,
  financial: BarChart3,
  settings: Settings,
  pos: ShoppingCart,
  marketing: BarChart3,
  dashboard: BarChart3
} as const;

const MODULE_COLORS = {
  inventory: 'bg-blue-100 text-blue-800',
  sales: 'bg-green-100 text-green-800',
  purchasing: 'bg-purple-100 text-purple-800',
  crm: 'bg-orange-100 text-orange-800',
  communication: 'bg-cyan-100 text-cyan-800',
  administration: 'bg-gray-100 text-gray-800',
  reports: 'bg-indigo-100 text-indigo-800',
  financial: 'bg-emerald-100 text-emerald-800',
  settings: 'bg-slate-100 text-slate-800',
  pos: 'bg-lime-100 text-lime-800',
  marketing: 'bg-pink-100 text-pink-800',
  dashboard: 'bg-teal-100 text-teal-800'
} as const;

const EnhancedRoleManagement: React.FC = () => {
  const { userRoles, loading, saveUserRole, deleteUserRole, loadAllData } = useRoleManagement();
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    level: 1,
    color: '#6366f1',
    permissions: {}
  });

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const { data: permissionsData, error: permError } = await supabase
        .from('system_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('resource', { ascending: true })
        .order('action', { ascending: true });

      if (permError) throw permError;
      setPermissions(permissionsData || []);

      const { data: rolePermData, error: rolePermError } = await supabase
        .from('role_permissions')
        .select('*');

      if (rolePermError) throw rolePermError;
      setRolePermissions(rolePermData || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const groupPermissionsByCategory = (permissions: SystemPermission[]) => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = {};
      }
      if (!acc[permission.category][permission.resource]) {
        acc[permission.category][permission.resource] = [];
      }
      acc[permission.category][permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Record<string, SystemPermission[]>>);
  };

  const getRolePermissions = (roleId: string) => {
    return rolePermissions
      .filter(rp => rp.role_id === roleId && rp.granted)
      .map(rp => rp.permission_id);
  };

  const getRolePermissionCount = (roleId: string) => {
    return rolePermissions.filter(rp => rp.role_id === roleId && rp.granted).length;
  };

  const isAdminRole = (role: UserRole) => {
    return role.name.toLowerCase().includes('admin') || 
           role.permissions?.all === true ||
           getRolePermissionCount(role.id) >= permissions.length * 0.8; // 80% or more permissions
  };

  const handlePermissionChange = (permissionId: string, granted: boolean) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionId]: granted
      }
    }));
  };

  const handleSaveRole = async () => {
    if (!roleFormData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      // Save role data
      const roleData: Partial<UserRole> = {
        id: editingRole?.id,
        name: roleFormData.name,
        description: roleFormData.description,
        level: roleFormData.level,
        color: roleFormData.color,
        is_editable: true,
        is_active: true
      };

      const success = await saveUserRole(roleData);
      if (!success) return;

      // If editing existing role, get the role ID
      let roleId = editingRole?.id;
      if (!roleId) {
        // For new roles, fetch the created role
        const { data: newRole, error } = await supabase
          .from('user_roles')
          .select('id')
          .eq('name', roleFormData.name)
          .eq('tenant_id', await supabase.auth.getUser().then(r => r.data.user?.user_metadata?.tenant_id))
          .single();
        
        if (error || !newRole) {
          toast.error('Failed to get new role ID');
          return;
        }
        roleId = newRole.id;
      }

      // Delete existing role permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Insert new permissions
      const permissionsToInsert = Object.entries(roleFormData.permissions)
        .filter(([_, granted]) => granted)
        .map(([permissionId]) => ({
          role_id: roleId,
          permission_id: permissionId,
          granted: true
        }));

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast.success(`Role ${editingRole ? 'updated' : 'created'} successfully`);
      setIsRoleDialogOpen(false);
      resetRoleForm();
      await Promise.all([loadAllData(), fetchPermissions()]);
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    }
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      description: '',
      level: 1,
      color: '#6366f1',
      permissions: {}
    });
    setEditingRole(null);
  };

  const openEditRole = (role: UserRole) => {
    setEditingRole(role);
    
    // Get existing permissions for this role
    const existingPermissions = getRolePermissions(role.id);
    const permissionMap = existingPermissions.reduce((acc, permId) => {
      acc[permId] = true;
      return acc;
    }, {} as Record<string, boolean>);

    setRoleFormData({
      name: role.name,
      description: role.description || '',
      level: role.level || 1,
      color: role.color || '#6366f1',
      permissions: permissionMap
    });
    setIsRoleDialogOpen(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) return;
    
    try {
      // Delete role permissions first
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);
      
      // Delete the role
      await deleteUserRole(roleId);
      await fetchPermissions();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const toggleAllPermissionsForCategory = (category: string, granted: boolean) => {
    const categoryPermissions = permissions.filter(p => p.category === category);
    const updates = categoryPermissions.reduce((acc, permission) => {
      acc[permission.id] = granted;
      return acc;
    }, {} as Record<string, boolean>);

    setRoleFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        ...updates
      }
    }));
  };

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedPermissions = groupPermissionsByCategory(permissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Role & Permission Management</h2>
          <p className="text-muted-foreground">Manage detailed user roles and granular permissions</p>
        </div>
        <Button onClick={() => Promise.all([loadAllData(), fetchPermissions()])} variant="outline">
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permission Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    User Roles
                  </CardTitle>
                  <CardDescription>
                    Manage user roles with granular permission controls
                  </CardDescription>
                </div>
                <PermissionGuard role={['superadmin', 'admin', 'manager']}>
                  <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetRoleForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRole ? 'Edit Role' : 'Create New Role'}
                        </DialogTitle>
                        <DialogDescription>
                          Define the role details and assign specific permissions
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[70vh]">
                        <div className="space-y-6 pr-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="name">Role Name</Label>
                              <Input
                                id="name"
                                value={roleFormData.name}
                                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                                placeholder="e.g., Store Manager"
                              />
                            </div>
                            <div>
                              <Label htmlFor="level">Level</Label>
                              <Input
                                id="level"
                                type="number"
                                min="1"
                                max="10"
                                value={roleFormData.level}
                                onChange={(e) => setRoleFormData({ ...roleFormData, level: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={roleFormData.description}
                              onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                              placeholder="Describe this role's responsibilities..."
                            />
                          </div>

                          <div className="space-y-4">
                            <Label className="text-lg font-semibold">Permissions</Label>
                            {Object.entries(groupedPermissions).map(([category, resources]) => {
                              const IconComponent = MODULE_ICONS[category as keyof typeof MODULE_ICONS] || Settings;
                              const categoryPerms = permissions.filter(p => p.category === category);
                              const selectedCount = categoryPerms.filter(p => roleFormData.permissions[p.id]).length;
                              
                              return (
                                <Card key={category} className="border-l-4 border-l-primary">
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <IconComponent className="h-5 w-5" />
                                        <CardTitle className="text-base capitalize">
                                          {category.replace('_', ' ')}
                                        </CardTitle>
                                        <Badge variant="outline" className={MODULE_COLORS[category as keyof typeof MODULE_COLORS] || 'bg-gray-100 text-gray-800'}>
                                          {selectedCount}/{categoryPerms.length}
                                        </Badge>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => toggleAllPermissionsForCategory(category, true)}
                                        >
                                          Select All
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => toggleAllPermissionsForCategory(category, false)}
                                        >
                                          Clear All
                                        </Button>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    {Object.entries(resources).map(([resource, perms]) => (
                                      <div key={resource} className="space-y-2">
                                        <h4 className="font-medium text-sm capitalize text-muted-foreground">
                                          {resource.replace('_', ' ')}
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                          {perms.map((permission) => (
                                            <div key={permission.id} className="flex items-center space-x-2">
                                              <Checkbox
                                                id={permission.id}
                                                checked={!!roleFormData.permissions[permission.id]}
                                                onCheckedChange={(checked) => 
                                                  handlePermissionChange(permission.id, !!checked)
                                                }
                                              />
                                              <Label 
                                                htmlFor={permission.id} 
                                                className="text-xs cursor-pointer flex items-center gap-1"
                                              >
                                                {permission.action}
                                                {permission.is_critical && (
                                                  <Badge variant="destructive" className="text-xs px-1">
                                                    Critical
                                                  </Badge>
                                                )}
                                              </Label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveRole}>
                          <Save className="h-4 w-4 mr-2" />
                          {editingRole ? 'Update' : 'Create'} Role
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userRoles.map((role) => {
                  const rolePermissionCount = getRolePermissions(role.id).length;
                  const isAdmin = isAdminRole(role);
                  return (
                    <Card key={role.id} className={`relative border-l-4 ${isAdmin ? 'ring-2 ring-red-200 bg-red-50/50' : ''}`} style={{ borderLeftColor: role.color }}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className={`text-base ${isAdmin ? 'text-red-700 font-bold' : ''}`}>
                            {role.name}
                            {isAdmin && (
                              <Shield className="h-4 w-4 ml-1 inline text-red-600" />
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            <Badge variant={isAdmin ? "destructive" : "outline"} style={!isAdmin ? { borderColor: role.color } : {}}>
                              Level {role.level || 1}
                            </Badge>
                            <PermissionGuard role={['superadmin', 'admin', 'manager']}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditRole(role)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {role.is_editable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRole(role.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </PermissionGuard>
                          </div>
                        </div>
                        {role.description && (
                          <CardDescription className="text-sm">
                            {role.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Permissions</span>
                            <Badge variant={isAdmin ? "destructive" : "secondary"} className="text-xs">
                              {rolePermissionCount}/{permissions.length}
                              {isAdmin && rolePermissionCount === permissions.length && (
                                <CheckCircle2 className="h-3 w-3 ml-1" />
                              )}
                            </Badge>
                          </div>
                          {isAdmin && (
                            <Badge variant="destructive" className="text-xs mr-1 mb-1">
                              <Shield className="h-3 w-3 mr-1" />
                              Full Admin Access
                            </Badge>
                          )}
                          {role.can_manage_users && (
                            <Badge variant="outline" className="text-xs mr-1 mb-1">
                              <Users className="h-3 w-3 mr-1" />
                              User Management
                            </Badge>
                          )}
                          {role.can_manage_settings && (
                            <Badge variant="outline" className="text-xs mr-1 mb-1">
                              <Settings className="h-3 w-3 mr-1" />
                              Settings
                            </Badge>
                          )}
                          {role.can_view_reports && (
                            <Badge variant="outline" className="text-xs mr-1 mb-1">
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Reports
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Permissions Overview
              </CardTitle>
              <CardDescription>
                Overview of all available system permissions organized by module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, resources]) => {
                  const IconComponent = MODULE_ICONS[category as keyof typeof MODULE_ICONS] || Settings;
                  return (
                    <Card key={category} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <IconComponent className="h-5 w-5" />
                          {category.replace('_', ' ').toUpperCase()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {Object.entries(resources).map(([resource, perms]) => (
                            <div key={resource}>
                              <h4 className="font-medium mb-2 capitalize">
                                {resource.replace('_', ' ')}
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {perms.map((permission) => (
                                  <Badge
                                    key={permission.id}
                                    variant={permission.is_critical ? "destructive" : "secondary"}
                                    className="text-xs"
                                  >
                                    {permission.action}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedRoleManagement;