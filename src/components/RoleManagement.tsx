import React from 'react';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Package,
  Users,
  Settings,
  Eye,
  Crown,
  Star,
  Zap,
  Rocket,
  Plus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import EnhancedRoleManagement from '@/components/EnhancedRoleManagement';

const RoleManagement: React.FC = () => {
  const {
    systemFeatures,
    featureSets,
    tenantFeatures,
    permissionTemplates,
    loading,
    toggleTenantFeature,
    applyFeatureSet,
    loadAllData,
  } = useRoleManagement();

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

  const groupFeaturesByCategory = (features: any[]) => {
    return features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, any[]>);
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

      <Tabs defaultValue="enhanced-roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="enhanced-roles">User Roles & Permissions</TabsTrigger>
          <TabsTrigger value="features">System Features</TabsTrigger>
          <TabsTrigger value="templates">Permission Templates</TabsTrigger>
          <TabsTrigger value="sets">Feature Sets</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced-roles" className="space-y-6">
          <EnhancedRoleManagement />
        </TabsContent>

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
                    {(features as any[]).map((feature: any) => (
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
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="mb-2">
                        {template.category}
                      </Badge>
                      <pre className="text-xs bg-muted p-2 rounded">
                        {JSON.stringify(template.template_data, null, 2)}
                      </pre>
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
                Collections of features that can be applied together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featureSets.map((featureSet) => (
                  <Card key={featureSet.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{featureSet.display_name}</CardTitle>
                        <PermissionGuard role={['superadmin', 'admin', 'manager']}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyFeatureSet(featureSet.name)}
                          >
                            Apply Set
                          </Button>
                        </PermissionGuard>
                      </div>
                      {featureSet.description && (
                        <CardDescription className="text-sm">
                          {featureSet.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {featureSet.features.map((featureName) => (
                          <Badge key={featureName} variant="secondary" className="text-xs mr-1 mb-1">
                            {featureName}
                          </Badge>
                        ))}
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