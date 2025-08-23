import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, Shield, Crown, UserCheck, UserX, Mail, 
  Settings, Eye, Edit, Trash2, Plus, ArrowUpDown 
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  color: string;
  is_system_role: boolean;
  user_count: number;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  is_critical: boolean;
}

export const RoleManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Role templates for quick creation
  const roleTemplates = [
    {
      name: 'Sales Manager',
      description: 'Manage sales operations and team',
      level: 2,
      color: '#2563eb',
      permissions: ['view_dashboard', 'create_sales', 'edit_sales', 'view_reports', 'manage_customers']
    },
    {
      name: 'Inventory Manager',
      description: 'Manage product inventory and stock',
      level: 2,
      color: '#059669',
      permissions: ['view_dashboard', 'create_products', 'edit_products', 'manage_categories', 'view_reports']
    },
    {
      name: 'Customer Service',
      description: 'Handle customer interactions and support',
      level: 3,
      color: '#7c3aed',
      permissions: ['view_dashboard', 'view_customers', 'manage_customers', 'view_sales']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCreatingRole(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: role.color }}
                  />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  {role.is_system_role && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <Badge variant="outline">Level {role.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Users assigned:</span>
                  <Badge variant="secondary">{role.user_count}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Permissions:</span>
                  <Badge variant="outline">{role.permissions.length}</Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedRole(role);
                      setIsEditingRole(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedRole(role)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Role Dialog */}
      <Dialog open={isCreatingRole} onOpenChange={setIsCreatingRole}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <RoleForm 
            mode="create"
            onSave={() => setIsCreatingRole(false)}
            onCancel={() => setIsCreatingRole(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditingRole} onOpenChange={setIsEditingRole}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          <RoleForm 
            mode="edit"
            role={selectedRole}
            onSave={() => setIsEditingRole(false)}
            onCancel={() => setIsEditingRole(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
