import React, { useState } from 'react';
import { useRoleManagement, UserRole, SystemFeature } from '@/hooks/useRoleManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Settings,
  Eye,
  CheckCircle,
  XCircle,
  Package,
  Crown,
  Lock,
  Unlock,
  Star,
  Zap,
  Rocket
} from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';

interface RoleFormData {
  name: string;
  description: string;
  level: number;
  can_manage_users: boolean;
  can_manage_settings: boolean;
  can_view_reports: boolean;
  permissions: Record<string, string[]>;
  color: string;
}

const RoleManagement: React.FC = () => {
  const {
    systemFeatures,
    featureSets,
    tenantFeatures,
    permissionTemplates,
    userRoles,
    loading,
    toggleTenantFeature,
    saveUserRole,
    deleteUserRole,
    applyFeatureSet,
    loadAllData,
  } = useRoleManagement();

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    level: 1,
    can_manage_users: false,
    can_manage_settings: false,
    can_view_reports: false,
    permissions: {},
    color: '#6366f1',
  });

  const getFeatureIcon = (category: string) => {
    switch (category) {
      case 'pos': return <Package className="h-4 w-4" />;
      case 'users': return <Users className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'analytics': return <Eye className="h-4 w-4" />;
      case 'integrations': return <Zap className="h-4 w-4" />;
      case 'branding': return <Star className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getFeatureTypeColor = (type: string) => {
    switch (type) {
      case 'core': return 'bg-green-100 text-green-800';
      case 'premium': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'addon': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFeatureTypeIcon = (type: string) => {
    switch (type) {
      case 'core': return <CheckCircle className="h-3 w-3" />;
      case 'premium': return <Crown className="h-3 w-3" />;
      case 'enterprise': return <Rocket className="h-3 w-3" />;
      case 'addon': return <Plus className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  const handleSaveRole = async () => {
    const roleData: Partial<UserRole> = {
      ...roleFormData,
      id: editingRole?.id,
    };

    const success = await saveUserRole(roleData);
    if (success) {
      setIsRoleDialogOpen(false);
      resetRoleForm();
    }
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      description: '',
      level: 1,
      can_manage_users: false,
      can_manage_settings: false,
      can_view_reports: false,
      permissions: {},
      color: '#6366f1',
    });
    setEditingRole(null);
  };

  const openEditRole = (role: UserRole) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || '',
      level: role.level || 1,
      can_manage_users: role.can_manage_users || false,
      can_manage_settings: role.can_manage_settings || false,
      can_view_reports: role.can_view_reports || false,
      permissions: role.permissions || {},
      color: role.color || '#6366f1',
    });
    setIsRoleDialogOpen(true);
  };

  const groupFeaturesByCategory = (features: SystemFeature[]) => {
    return features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, SystemFeature[]>);
  };

  const isFeatureEnabled = (featureName: string) => {
    return tenantFeatures.some(tf => tf.feature_name === featureName && tf.is_enabled);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedFeatures = groupFeaturesByCategory(systemFeatures);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role & Permission Management</h2>
          <p className="text-muted-foreground">Manage user roles, permissions, and system features</p>
        </div>
        <Button onClick={loadAllData} variant="outline">
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features">System Features</TabsTrigger>
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="templates">Permission Templates</TabsTrigger>
          <TabsTrigger value="sets">Feature Sets</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                System Features
              </CardTitle>
              <CardDescription>
                Enable or disable features for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedFeatures).map(([category, features]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                    {getFeatureIcon(category)}
                    {category.replace('_', ' ')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature) => (
                      <Card key={feature.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{feature.display_name}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getFeatureTypeColor(feature.feature_type)}>
                                {getFeatureTypeIcon(feature.feature_type)}
                                {feature.feature_type}
                              </Badge>
                              <PermissionGuard role={['superadmin', 'admin', 'manager']}>
                                <Switch
                                  checked={isFeatureEnabled(feature.name)}
                                  onCheckedChange={(checked) => toggleTenantFeature(feature.name, checked)}
                                />
                              </PermissionGuard>
                            </div>
                          </div>
                          {feature.description && (
                            <CardDescription className="text-xs">
                              {feature.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        {feature.requires_subscription && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Premium
                            </Badge>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

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
                    Manage user roles and their permissions
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
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRole ? 'Edit Role' : 'Create New Role'}
                        </DialogTitle>
                        <DialogDescription>
                          Define the role permissions and capabilities
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
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
                        <div className="space-y-3">
                          <Label>Role Capabilities</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={roleFormData.can_manage_users}
                                onCheckedChange={(checked) => setRoleFormData({ ...roleFormData, can_manage_users: checked })}
                              />
                              <Label>Can manage users</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={roleFormData.can_manage_settings}
                                onCheckedChange={(checked) => setRoleFormData({ ...roleFormData, can_manage_settings: checked })}
                              />
                              <Label>Can manage settings</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={roleFormData.can_view_reports}
                                onCheckedChange={(checked) => setRoleFormData({ ...roleFormData, can_view_reports: checked })}
                              />
                              <Label>Can view reports</Label>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveRole}>
                            {editingRole ? 'Update' : 'Create'} Role
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userRoles.map((role) => (
                  <Card key={role.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{role.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" style={{ borderColor: role.color }}>
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
                                onClick={() => deleteUserRole(role.id)}
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
                        {role.can_manage_users && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            User Management
                          </Badge>
                        )}
                        {role.can_manage_settings && (
                          <Badge variant="secondary" className="text-xs">
                            <Settings className="h-3 w-3 mr-1" />
                            Settings
                          </Badge>
                        )}
                        {role.can_view_reports && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Reports
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Permission Templates
              </CardTitle>
              <CardDescription>
                Pre-defined permission sets for common roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant={template.is_system_template ? "default" : "secondary"}>
                          {template.is_system_template ? "System" : "Custom"}
                        </Badge>
                      </div>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Permissions Preview:</Label>
                        <div className="text-xs bg-muted p-2 rounded">
                          <pre>{JSON.stringify(template.template_data, null, 2)}</pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Feature Sets
              </CardTitle>
              <CardDescription>
                Pre-configured collections of features for different business needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featureSets.map((set) => (
                  <Card key={set.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{set.display_name}</CardTitle>
                        <PermissionGuard role={['superadmin', 'admin']}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyFeatureSet(set.name)}
                          >
                            Apply
                          </Button>
                        </PermissionGuard>
                      </div>
                      {set.description && (
                        <CardDescription>{set.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Included Features:</Label>
                        <div className="flex flex-wrap gap-1">
                          {set.features.map((featureName) => {
                            const feature = systemFeatures.find(f => f.name === featureName);
                            return (
                              <Badge key={featureName} variant="outline" className="text-xs">
                                {feature?.display_name || featureName}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoleManagement;