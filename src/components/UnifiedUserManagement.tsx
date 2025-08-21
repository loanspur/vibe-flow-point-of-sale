import React, { useState } from 'react';
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
import { 
  Users, Shield, Edit, Trash2, Eye, Plus, Settings, Activity, 
  Clock, AlertTriangle, Ban, CheckCircle, XCircle, Mail,
  UserPlus, Crown, Key
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useUnifiedUserManagement, UnifiedUser, UnifiedRole } from '@/hooks/useUnifiedUserManagement';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/contexts/AuthContext';


const UnifiedUserManagement = () => {
  const { user, userRole, tenantId } = useAuth();
  
  const {
    users,
    roles,
    permissions,
    activityLogs,
    userSessions,
    loading,
    fetchAllData,
    inviteUser,
    updateUserRole,
    deactivateUser,
    createRole,
    updateRole,
    deleteRole,
    hasPermission,
    hasRoleAccess
  } = useUnifiedUserManagement();

  const { logActivity } = useActivityLogger();

  console.log('UnifiedUserManagement Debug:', {
    loading,
    usersCount: users.length,
    rolesCount: roles.length,
    currentUser: users.find(u => u.user_id === user?.id),
    authUser: user?.id,
    userRole,
    tenantId
  });

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UnifiedRole | null>(null);
  const [isViewingUser, setIsViewingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);

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

  // Filter functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Status badge helpers
  const getStatusBadge = (status: string, invitationStatus: string) => {
    if (status === 'active') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
    } else if (status === 'pending') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    } else if (status === 'invited') {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Invited</Badge>;
    } else {
      return <Badge variant="destructive">Inactive</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleData = roles.find(r => r.name === role);
    return (
      <Badge 
        variant="outline" 
        style={{ backgroundColor: roleData?.color + '20', borderColor: roleData?.color }}
      >
        {role}
      </Badge>
    );
  };

  // Handlers
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
        logActivity({
          action_type: 'user_invited',
          resource_type: 'user',
          details: { email: newUserEmail, role: newUserRole }
        });
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
        logActivity({
          action_type: 'role_created',
          resource_type: 'role',
          details: { name: newRoleName, permissions: selectedPermissions.length }
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, roleId: string) => {
    const success = await updateUserRole(userId, roleId);
    if (success) {
      const user = users.find(u => u.user_id === userId);
      const role = roles.find(r => r.id === roleId);
      logActivity({
        action_type: 'user_role_updated',
        resource_type: 'user',
        resource_id: userId,
        details: { new_role: role?.name, user_email: user?.email }
      });
    }
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
        logActivity({
          action_type: 'role_updated',
          resource_type: 'role',
          resource_id: selectedRole.id,
          details: { name: newRoleName, permissions: selectedPermissions.length }
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      const success = await deleteRole(roleId);
      if (success) {
        logActivity({
          action_type: 'role_deleted',
          resource_type: 'role',
          resource_id: roleId,
          details: { name: roleName }
        });
      }
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      const success = await deactivateUser(userId);
      if (success) {
        const user = users.find(u => u.user_id === userId);
        logActivity({
          action_type: 'user_deactivated',
          resource_type: 'user',
          resource_id: userId,
          details: { user_email: user?.email }
        });
      }
    }
  };

  // Permission categories
  const permissionCategories = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

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
                            {role.name}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
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
                        {role.name}
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
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.full_name}</div>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Settings className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* View Details - Available to everyone */}
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setIsViewingUser(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>

                            {hasRoleAccess(['admin', 'manager']) && (
                              <>
                                <DropdownMenuSeparator />
                                
                                {/* Edit User Profile */}
                                <DropdownMenuItem onClick={() => {
                                  setSelectedUser(user);
                                  // TODO: Open edit user dialog
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Profile
                                </DropdownMenuItem>

                                {/* Change Role */}
                                <DropdownMenuItem onClick={() => {
                                  setSelectedUser(user);
                                  // TODO: Open role change dialog
                                }}>
                                  <Crown className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>

                                {/* Reset Password / Send Password Reset */}
                                <DropdownMenuItem onClick={() => {
                                  // TODO: Handle password reset
                                  toast.info('Password reset functionality coming soon');
                                }}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {/* Status Management */}
                                {user.status === 'pending' && (
                                  <DropdownMenuItem onClick={() => {
                                    // TODO: Resend invitation
                                    toast.info('Resending invitation...');
                                  }}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Resend Invitation
                                  </DropdownMenuItem>
                                )}

                                {user.status === 'inactive' && (
                                  <DropdownMenuItem onClick={() => {
                                    // TODO: Activate user
                                    toast.info('User activation functionality coming soon');
                                  }} className="text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activate User
                                  </DropdownMenuItem>
                                )}

                                {user.status === 'active' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleDeactivateUser(user.user_id)}
                                    className="text-orange-600"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Deactivate User
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                {/* Danger Zone */}
                                {user.status !== 'active' && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to permanently delete ${user.full_name}? This action cannot be undone.`)) {
                                        // TODO: Delete user
                                        toast.info('User deletion functionality coming soon');
                                      }
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Special actions for current user */}
                            {user.user_id === user?.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // TODO: Open profile settings
                                  toast.info('Profile settings coming soon');
                                }}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  My Profile Settings
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                <Activity className="h-5 w-5" />
                Activity Logs ({activityLogs.length})
              </CardTitle>
              <CardDescription>
                Recent user activities and system events in chronological order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <div className="text-muted-foreground">No activity logs found</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="font-medium">{log.user_name || 'System'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.action_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.resource_type ? (
                            <Badge variant="secondary" className="text-xs">
                              {log.resource_type.toUpperCase()}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono">
                            {log.ip_address || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.details ? (
                            <div className="text-xs text-muted-foreground max-w-xs truncate">
                              {typeof log.details === 'object' 
                                ? Object.entries(log.details).map(([key, value]) => 
                                    `${key}: ${value}`
                                  ).join(', ')
                                : String(log.details)
                              }
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Currently active user sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <div className="text-muted-foreground">No active sessions</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Device</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSessions.map(session => (
                      <TableRow key={session.id}>
                        <TableCell>{session.user_name}</TableCell>
                        <TableCell>{session.ip_address || 'Unknown'}</TableCell>
                        <TableCell>{new Date(session.last_activity).toLocaleString()}</TableCell>
                        <TableCell>
                          {session.device_info ? (
                            <span className="text-sm">{JSON.stringify(session.device_info)}</span>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
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
    </div>
  );
};

export default UnifiedUserManagement;