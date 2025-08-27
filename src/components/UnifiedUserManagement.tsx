import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Users, Shield, Edit, Eye, UserPlus, Crown, User, CheckCircle, Clock, Mail, Ban,
  Plus, Settings, Key, BarChart3, Trash2, MoreHorizontal, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedUserManagement } from '@/hooks/useUnifiedUserManagement';

// Use the interfaces from the hook
import type { UnifiedUser, UnifiedRole, SystemPermission, ActivityLog } from '@/hooks/useUnifiedUserManagement';

const UnifiedUserManagement = () => {
  const { user: authUser, userRole, tenantId } = useAuth();
  
  // Use the existing hook for all data management
  const {
    users,
    roles,
    permissions,
    activityLogs,
    loading,
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
    hasPermission,
    hasRoleAccess,
  } = useUnifiedUserManagement();

  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UnifiedRole | null>(null);
  const [isViewingUser, setIsViewingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isConfirmingDeactivation, setIsConfirmingDeactivation] = useState(false);

  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(1);
  const [newRoleColor, setNewRoleColor] = useState('#2563eb');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  
  // User edit form states
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [selectedRoleForChange, setSelectedRoleForChange] = useState('');



  useEffect(() => {
    if (tenantId) {
      fetchAllData();
    }
  }, [tenantId, fetchAllData]);

  console.log('UnifiedUserManagement Debug:', {
    loading,
    usersCount: users.length,
    rolesCount: roles.length,
    authUser: authUser?.id,
    userRole,
    tenantId
  });

  // Filter functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Helper functions
  const permissionCategories = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  // Enhanced handlers using hook functions
  const handleInviteUser = async () => {
    if (!newUserEmail || !newUserRole || !newUserFullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const success = await inviteUser(newUserEmail, newUserRole, newUserFullName);
      if (success) {
        setNewUserEmail('');
        setNewUserFullName('');
        setNewUserRole('');
        setIsCreatingUser(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName) {
      toast.error('Please enter a role name');
      return;
    }

    setCreating(true);
    try {
      const success = await createRole({
        name: newRoleName,
        description: newRoleDescription,
        level: newRoleLevel,
        color: newRoleColor,
        permissions: selectedPermissions
      });
      if (success) {
        setNewRoleName('');
        setNewRoleDescription('');
        setNewRoleLevel(1);
        setNewRoleColor('#2563eb');
        setSelectedPermissions([]);
        setIsCreatingRole(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, roleId: string) => {
    const success = await updateUserRole(userId, roleId);
    return success;
  };

  const handleEditRole = (role: UnifiedRole) => {
    setSelectedRole(role);
    setNewRoleName(role.name);
    setNewRoleDescription(role.description);
    setNewRoleLevel(role.level);
    setNewRoleColor(role.color);
    setSelectedPermissions(role.permissions.map(p => p.id));
    setIsEditingRole(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !newRoleName) {
      toast.error('Please enter a role name');
      return;
    }

    setCreating(true);
    try {
      const success = await updateRole(selectedRole.id, {
        name: newRoleName,
        description: newRoleDescription,
        level: newRoleLevel,
        color: newRoleColor,
        permissions: selectedPermissions
      });
      if (success) {
        setNewRoleName('');
        setNewRoleDescription('');
        setNewRoleLevel(1);
        setNewRoleColor('#2563eb');
        setSelectedPermissions([]);
        setIsEditingRole(false);
        setSelectedRole(null);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      await deleteRole(roleId);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      await deactivateUser(userId);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleData = roles.find(r => r.name === role);
    const roleColors: Record<string, string> = {
      'admin': '#dc2626',
      'manager': '#ea580c',
      'cashier': '#059669',
      'user': '#2563eb',
      'superadmin': '#7c3aed',
    };
    
    const color = roleData?.color || roleColors[role.toLowerCase()] || '#6b7280';
    const roleIcons: Record<string, React.ReactNode> = {
      'admin': <Crown className="h-3 w-3 mr-1" />,
      'manager': <Shield className="h-3 w-3 mr-1" />,
      'cashier': <Users className="h-3 w-3 mr-1" />,
      'user': <User className="h-3 w-3 mr-1" />,
      'superadmin': <Crown className="h-3 w-3 mr-1" />,
    };
    
    // Use the actual role name from the database or fallback to the provided role
    const displayRole = roleData?.name || role;
    
    return (
      <Badge 
        variant="outline" 
        style={{ backgroundColor: color + '20', borderColor: color, color: color }}
        className="font-medium"
      >
        {roleIcons[displayRole.toLowerCase()] || <User className="h-3 w-3 mr-1" />}
        {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string, invitationStatus: string) => {
    const statusConfig: Record<string, { badge: React.ReactNode; icon: React.ReactNode }> = {
      'active': {
        badge: <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Active</Badge>,
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
      'pending': {
        badge: <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>,
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      'invited': {
        badge: <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Invited</Badge>,
        icon: <Mail className="h-3 w-3 mr-1" />
      },
      'inactive': {
        badge: <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Inactive</Badge>,
        icon: <Ban className="h-3 w-3 mr-1" />
      }
    };

    const config = statusConfig[status] || statusConfig['inactive'];
    
    return (
      <div className="flex items-center">
        {config.icon}
        {config.badge}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User & Role Management</h2>
          <p className="text-muted-foreground">Unified user management, roles, permissions, and activity tracking</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAllData} variant="outline">
            Refresh
          </Button>
          {hasRoleAccess(['admin', 'manager']) && (
            <Dialog open={isCreatingUser} onOpenChange={setIsCreatingUser}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>Send an invitation to a new user to join your organization.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUserRole} onValueChange={setNewUserRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: role.color }}
                              />
                              {role.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleInviteUser} 
                      disabled={creating}
                      className="flex-1"
                    >
                      {creating ? 'Sending...' : 'Send Invitation'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreatingUser(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                Manage users, their roles, and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          />
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">User</TableHead>
                    <TableHead className="w-[150px]">Role</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[120px]">Last Login</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                            <span className="text-sm font-semibold text-primary">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {getRoleBadge(user.role)}
                          {user.roles.length > 1 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.roles.length - 1} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status, user.invitation_status)}
                      </TableCell>
                      <TableCell>
                        {user.last_login ? (
                          <div className="text-sm">
                            {new Date(user.last_login).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {/* View Details Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-50"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsViewingUser(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>

                          {/* Admin Actions */}
                            {hasRoleAccess(['admin', 'manager']) && (
                              <>
                              {/* Edit Profile Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditUserFullName(user.full_name);
                                  setEditUserEmail(user.email || '');
                                  setIsEditingUser(true);
                                }}
                                title="Edit Profile"
                              >
                                <Edit className="h-4 w-4 text-green-600" />
                              </Button>

                              {/* Change Role Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-purple-50"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRoleForChange(user.role);
                                  setIsChangingRole(true);
                                }}
                                title="Change Role"
                              >
                                <Crown className="h-4 w-4 text-purple-600" />
                              </Button>

                                                              {/* Status Management Buttons */}
                                {user.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-blue-50"
                                    onClick={() => {
                                    const roleId = roles.find(r => r.name === user.role)?.id;
                                    if (roleId) {
                                      resendInvitation(user.email || '', roleId, user.full_name);
                                    }
                                    }}
                                    title="Resend Invitation"
                                  >
                                    <Mail className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}

                                {user.status === 'inactive' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-green-50"
                                    onClick={() => activateUser(user.user_id)}
                                    title="Activate User"
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}

                                {user.status === 'active' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-orange-50"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsConfirmingDeactivation(true);
                                    }}
                                    title="Deactivate User"
                                  >
                                    <Ban className="h-4 w-4 text-orange-600" />
                                  </Button>
                                )}

                                {/* Delete User Button */}
                                {user.status !== 'active' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsConfirmingDeactivation(true);
                                    }}
                                    title="Delete User"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </>
                          )}

                          {/* More Actions Dropdown for additional options */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Additional Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {/* Reset Password */}
                              {hasRoleAccess(['admin', 'manager']) && (
                                <DropdownMenuItem onClick={() => {
                                  if (window.confirm(`Send password reset email to ${user.email}?`)) {
                                    toast.info('Password reset functionality coming soon');
                                  }
                                }}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                              )}

                              {/* Show current user's role for debugging */}
                              {process.env.NODE_ENV === 'development' && (
                                <DropdownMenuItem disabled>
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Role: {userRole || 'No role'} | HasAccess: {hasRoleAccess(['admin', 'manager']) ? 'Yes' : 'No'}
                                </DropdownMenuItem>
                            )}

                            {/* Special actions for current user */}
                            {user.user_id === authUser?.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  toast.info('Profile settings coming soon');
                                }}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  My Profile Settings
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Manage Roles</h3>
            {hasRoleAccess(['admin', 'manager']) && (
              <Dialog open={isCreatingRole} onOpenChange={setIsCreatingRole}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>Define a new role with specific permissions for your organization.</DialogDescription>
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
                        <Label htmlFor="roleLevel">Level (lower = higher priority)</Label>
                        <Input
                          id="roleLevel"
                          type="number"
                          value={newRoleLevel}
                          onChange={(e) => setNewRoleLevel(parseInt(e.target.value))}
                          min="1"
                          max="100"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="roleDescription">Description</Label>
                      <Textarea
                        id="roleDescription"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        placeholder="Describe the role's responsibilities..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="roleColor">Color</Label>
                      <Input
                        id="roleColor"
                        type="color"
                        value={newRoleColor}
                        onChange={(e) => setNewRoleColor(e.target.value)}
                        className="w-20 h-10"
                      />
                    </div>
                    
                    <div>
                      <Label>Permissions</Label>
                      <div className="max-h-48 overflow-y-auto space-y-4 mt-2">
                        {Object.entries(permissionCategories).map(([category, perms]) => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium text-sm capitalize">{category}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {perms.map(perm => (
                                <div key={perm.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={perm.id}
                                    checked={selectedPermissions.includes(perm.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedPermissions([...selectedPermissions, perm.id]);
                                      } else {
                                        setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                                      }
                                    }}
                                  />
                                  <label htmlFor={perm.id} className="text-sm">
                                    {perm.name}
                                    {perm.is_critical && <Crown className="h-3 w-3 inline ml-1 text-yellow-500" />}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={handleCreateRole} 
                        disabled={creating}
                        className="flex-1"
                      >
                        {creating ? 'Creating...' : 'Create Role'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreatingRole(false)}
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle 
                      className="text-base"
                      style={{ color: role.color }}
                    >
                      {role.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Level {role.level}
                      </Badge>
                      {hasRoleAccess(['admin', 'manager']) && role.is_editable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditRole(role)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRole(role.id, role.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  {role.description && (
                    <CardDescription className="text-sm">
                      {role.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Permissions ({role.permissions.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map(perm => (
                        <Badge key={perm.id} variant="secondary" className="text-xs">
                          {perm.name}
                        </Badge>
                      ))}
                      {role.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Role Dialog */}
          <Dialog open={isEditingRole} onOpenChange={setIsEditingRole}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Role</DialogTitle>
                <DialogDescription>Update role details and permissions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editRoleName">Role Name</Label>
                    <Input
                      id="editRoleName"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g., Sales Manager"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editRoleLevel">Level (lower = higher priority)</Label>
                    <Input
                      id="editRoleLevel"
                      type="number"
                      value={newRoleLevel}
                      onChange={(e) => setNewRoleLevel(parseInt(e.target.value))}
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="editRoleDescription">Description</Label>
                  <Textarea
                    id="editRoleDescription"
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="Describe the role's responsibilities..."
                  />
                </div>
                <div>
                  <Label htmlFor="editRoleColor">Color</Label>
                  <Input
                    id="editRoleColor"
                    type="color"
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-20 h-10"
                  />
                </div>
                
                <div>
                  <Label>Permissions</Label>
                  <div className="max-h-48 overflow-y-auto space-y-4 mt-2">
                    {Object.entries(permissionCategories).map(([category, perms]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm capitalize">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {perms.map(perm => (
                            <div key={perm.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${perm.id}`}
                                checked={selectedPermissions.includes(perm.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPermissions([...selectedPermissions, perm.id]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                                  }
                                }}
                              />
                              <label htmlFor={`edit-${perm.id}`} className="text-sm">
                                {perm.name}
                                {perm.is_critical && <Crown className="h-3 w-3 inline ml-1 text-yellow-500" />}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleUpdateRole} 
                    disabled={creating}
                    className="flex-1"
                  >
                    {creating ? 'Updating...' : 'Update Role'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingRole(false);
                      setSelectedRole(null);
                      setNewRoleName('');
                      setNewRoleDescription('');
                      setNewRoleLevel(1);
                      setNewRoleColor('#2563eb');
                      setSelectedPermissions([]);
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                System Permissions
              </CardTitle>
              <CardDescription>
                All available permissions organized by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(permissionCategories).map(([category, perms]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {perms.map(perm => (
                      <Card key={perm.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {perm.name}
                              {perm.is_critical && <Crown className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <div className="text-sm text-muted-foreground">{perm.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {perm.resource}:{perm.action}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                User Activity Logs
              </CardTitle>
              <CardDescription>
                Track user actions and system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <div className="text-muted-foreground">No activity logs found</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Activity logs will appear here as users perform actions
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.user_name || 'Unknown User'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium capitalize">{log.action_type?.replace('_', ' ') || 'Unknown'}</div>
                            {log.resource_type && (
                              <div className="text-sm text-muted-foreground capitalize">
                                {log.resource_type.replace('_', ' ')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.resource_type ? (
                            <Badge variant="outline" className="capitalize">
                              {log.resource_type.replace('_', ' ')}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.ip_address || (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={isViewingUser} onOpenChange={setIsViewingUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Detailed information about the selected user.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-medium">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.full_name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex gap-2 mt-1">
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser.status, selectedUser.invitation_status)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User ID</Label>
                  <div className="text-sm text-muted-foreground font-mono">{selectedUser.user_id}</div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div className="text-sm">{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <div className="text-sm">
                    {selectedUser.last_login 
                      ? new Date(selectedUser.last_login).toLocaleString() 
                      : 'Never'
                    }
                  </div>
                </div>
                <div>
                  <Label>All Roles</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedUser.roles.map(role => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>Update user information and details.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  value={editUserFullName}
                  onChange={(e) => setEditUserFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={async () => {
                    if (editUserFullName !== selectedUser.full_name || editUserEmail !== selectedUser.email) {
                      const success = await updateUserProfile(selectedUser.user_id, { 
                        full_name: editUserFullName,
                        email: editUserEmail 
                      });
                      if (success) {
                        setIsEditingUser(false);
                        setSelectedUser(null);
                      }
                    } else {
                      setIsEditingUser(false);
                      setSelectedUser(null);
                    }
                  }}
                  className="flex-1"
                >
                  Update Profile
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditingUser(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isChangingRole} onOpenChange={setIsChangingRole}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>Select a new role for the user.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleSelect">Select Role</Label>
                <Select value={selectedRoleForChange} onValueChange={setSelectedRoleForChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          />
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={async () => {
                    if (selectedRoleForChange && selectedRoleForChange !== selectedUser.role) {
                      const roleId = roles.find(r => r.name === selectedRoleForChange)?.id;
                      if (roleId) {
                        const success = await handleUpdateUserRole(selectedUser.user_id, roleId);
                        if (success) {
                          setIsChangingRole(false);
                          setSelectedUser(null);
                        }
                      }
                    } else {
                      setIsChangingRole(false);
                      setSelectedUser(null);
                    }
                  }}
                  className="flex-1"
                >
                  Update Role
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsChangingRole(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deactivation/Deletion */}
      <Dialog open={isConfirmingDeactivation} onOpenChange={setIsConfirmingDeactivation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {selectedUser?.status === 'active' 
                ? `Are you sure you want to deactivate ${selectedUser?.full_name}?`
                : `Are you sure you want to permanently delete ${selectedUser?.full_name}? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {selectedUser.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{selectedUser.full_name}</div>
                    <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                    <div className="flex gap-1 mt-1">
                      {getRoleBadge(selectedUser.role)}
                      {getStatusBadge(selectedUser.status, selectedUser.invitation_status)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="destructive"
                  onClick={async () => {
                    if (selectedUser.status === 'active') {
                      const success = await handleDeactivateUser(selectedUser.user_id);
                      if (success) {
                        setIsConfirmingDeactivation(false);
                        setSelectedUser(null);
                      }
                    } else {
                      const success = await deleteUser(selectedUser.user_id);
                      if (success) {
                        setIsConfirmingDeactivation(false);
                        setSelectedUser(null);
                      }
                    }
                  }}
                  className="flex-1"
                >
                  {selectedUser.status === 'active' ? 'Deactivate User' : 'Delete User'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsConfirmingDeactivation(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedUserManagement;