import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Package, 
  ShoppingCart, 
  Briefcase, 
  DollarSign, 
  BarChart3, 
  Settings, 
  CreditCard,
  MessageSquare,
  TrendingUp,
  Contact,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';

interface PermissionGroup {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  permissions: string[];
  sort_order: number;
}

interface BulkPermissionManagerProps {
  onPermissionsChange: (permissions: Record<string, boolean>) => void;
  selectedPermissions: Record<string, boolean>;
  availablePermissions: any[];
}

const categoryIcons = {
  inventory: Package,
  sales: ShoppingCart,
  purchasing: Briefcase,
  financial: DollarSign,
  reports: BarChart3,
  settings: Settings,
  pos: CreditCard,
  communication: MessageSquare,
  marketing: TrendingUp,
  crm: Contact,
  administration: Settings
} as const;

const categoryColors = {
  inventory: 'bg-blue-100 text-blue-800 border-blue-300',
  sales: 'bg-green-100 text-green-800 border-green-300',
  purchasing: 'bg-purple-100 text-purple-800 border-purple-300',
  financial: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  reports: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  settings: 'bg-slate-100 text-slate-800 border-slate-300',
  pos: 'bg-lime-100 text-lime-800 border-lime-300',
  communication: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  marketing: 'bg-pink-100 text-pink-800 border-pink-300',
  crm: 'bg-orange-100 text-orange-800 border-orange-300',
  administration: 'bg-gray-100 text-gray-800 border-gray-300'
} as const;

export const BulkPermissionManager: React.FC<BulkPermissionManagerProps> = ({
  onPermissionsChange,
  selectedPermissions,
  availablePermissions
}) => {
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPermissionGroups();
  }, []);

  const fetchPermissionGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('permission_groups')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPermissionGroups(data || []);
    } catch (error) {
      console.error('Error fetching permission groups:', error);
      toast.error('Failed to load permission groups');
    } finally {
      setLoading(false);
    }
  };

  const applyPermissionGroup = (groupName: string) => {
    const group = permissionGroups.find(g => g.name === groupName);
    if (!group) return;

    // Convert permission patterns to actual permission IDs
    const groupUpdates = group.permissions.reduce((acc, permission) => {
      if (permission.includes(':*')) {
        // Handle wildcard permissions (e.g., 'products:*')
        const resource = permission.split(':')[0];
        const resourcePermissions = availablePermissions.filter(p => p.resource === resource);
        resourcePermissions.forEach(p => {
          acc[p.id] = true;
        });
      } else {
        // Handle specific permissions (e.g., 'products:read')
        const [resource, action] = permission.split(':');
        const specificPermission = availablePermissions.find(p => p.resource === resource && p.action === action);
        if (specificPermission) {
          acc[specificPermission.id] = true;
        }
      }
      return acc;
    }, {} as Record<string, boolean>);

    onPermissionsChange(groupUpdates);
    toast.success(`Applied ${group.display_name} permission set`);
  };

  const clearAllPermissions = () => {
    const clearedPermissions = Object.keys(selectedPermissions).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);
    
    onPermissionsChange(clearedPermissions);
    toast.success('All permissions cleared');
  };

  const applyFullAccess = () => {
    const fullPermissions = availablePermissions.reduce((acc, permission) => {
      acc[permission.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    onPermissionsChange(fullPermissions);
    toast.success('Full access granted');
  };

  const groupedGroups = permissionGroups.reduce((acc, group) => {
    if (!acc[group.category]) {
      acc[group.category] = [];
    }
    acc[group.category].push(group);
    return acc;
  }, {} as Record<string, PermissionGroup[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedCount = Object.values(selectedPermissions).filter(Boolean).length;
  const totalCount = availablePermissions.length;

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base text-blue-900 dark:text-blue-100">
                Quick Permission Management
              </CardTitle>
              <Badge className="bg-blue-200 text-blue-800">
                {selectedCount}/{totalCount} selected
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllPermissions}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyFullAccess}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Full Access
              </Button>
            </div>
          </div>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Apply predefined permission groups to quickly configure role access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedGroups).map(([category, groups]) => {
              const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Settings;
              const colorClasses = categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800 border-gray-300';
              
              return (
                <Card key={category} className={`border ${colorClasses.split(' ')[2]} ${colorClasses.split(' ')[0]}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {category.replace('_', ' ').toUpperCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {groups.map((group) => (
                        <Button
                          key={group.name}
                          type="button"
                          variant="outline"
                          className="justify-start h-auto p-3 text-left"
                          onClick={() => applyPermissionGroup(group.name)}
                        >
                          <div>
                            <div className="font-medium text-sm">{group.display_name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {group.description}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 opacity-70">
                              {group.permissions.length} permissions
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkPermissionManager;