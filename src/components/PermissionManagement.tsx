import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield, Crown, Eye, Edit, Trash2, 
  Users, Package, DollarSign, BarChart3 
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  is_critical: boolean;
  granted: boolean;
}

const categoryIcons = {
  dashboard: BarChart3,
  users: Users,
  inventory: Package,
  sales: DollarSign,
  customers: Users,
  reports: BarChart3,
  settings: Shield
};

export const PermissionManagement = ({ 
  permissions, 
  onPermissionChange 
}: {
  permissions: Permission[];
  onPermissionChange: (permissionId: string, granted: boolean) => void;
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'dashboard', 'users', 'inventory', 'sales', 'customers', 'reports', 'settings'];
  
  const filteredPermissions = selectedCategory === 'all' 
    ? permissions 
    : permissions.filter(p => p.category === selectedCategory);

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons] || Shield;
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Icon className="h-4 w-4" />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          );
        })}
      </div>

      {/* Permissions Grid */}
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(categoryIcons[category as keyof typeof categoryIcons] || Shield, { className: 'h-5 w-5' })}
                {category.charAt(0).toUpperCase() + category.slice(1)} Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {perms.map((permission) => (
                  <div 
                    key={permission.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={permission.granted}
                      onCheckedChange={(checked) => 
                        onPermissionChange(permission.id, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{permission.name}</span>
                        {permission.is_critical && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {permission.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {permission.category}
                        </Badge>
                        {permission.is_critical && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
