import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Building2, Users, Settings, Trash2, AlertCircle } from 'lucide-react';
import CreateTenantAdminDialog from '@/components/CreateTenantAdminDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type TenantUser = Tables<'tenant_users'>;

export default function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [newTenant, setNewTenant] = useState({
    name: '',
    subdomain: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    plan_type: 'basic',
    max_users: 10
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch tenants error:', error);
        setError(error.message);
        return;
      }
      setTenants(data || []);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setError(error.message || 'An unexpected error occurred');
      toast({
        title: "Error",
        description: "Failed to fetch tenants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantUsers = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setTenantUsers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tenant users",
        variant: "destructive"
      });
    }
  };

  const createTenant = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([newTenant])
        .select()
        .single();

      if (error) throw error;

      setTenants([data, ...tenants]);
      setCreateDialogOpen(false);
      setNewTenant({
        name: '',
        subdomain: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        plan_type: 'basic',
        max_users: 10
      });

      toast({
        title: "Success",
        description: "Tenant created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tenant",
        variant: "destructive"
      });
    }
  };

  const toggleTenantStatus = async (tenant: Tenant) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: !tenant.is_active })
        .eq('id', tenant.id);

      if (error) throw error;

      setTenants(tenants.map(t => 
        t.id === tenant.id ? { ...t, is_active: !t.is_active } : t
      ));

      toast({
        title: "Success",
        description: `Tenant ${tenant.is_active ? 'deactivated' : 'activated'} successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tenant status",
        variant: "destructive"
      });
    }
  };

  const openUsersDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    fetchTenantUsers(tenant.id);
    setUsersDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access tenant management.</p>
          <Button className="mt-4" onClick={() => window.location.href = '/auth'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to view tenant management.
          </p>
          <p className="text-sm text-muted-foreground mb-4">Error: {error}</p>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">Manage tenants and their configurations</p>
        </div>
        
        <div className="flex gap-2">
          <CreateTenantAdminDialog onUserCreated={fetchTenants} />
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Add a new tenant to the system
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tenant Name</Label>
                <Input
                  id="name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="Enter tenant name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input
                  id="subdomain"
                  value={newTenant.subdomain}
                  onChange={(e) => setNewTenant({ ...newTenant, subdomain: e.target.value })}
                  placeholder="Enter subdomain"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={newTenant.contact_email}
                  onChange={(e) => setNewTenant({ ...newTenant, contact_email: e.target.value })}
                  placeholder="Enter contact email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan_type">Plan Type</Label>
                <Select value={newTenant.plan_type} onValueChange={(value) => setNewTenant({ ...newTenant, plan_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_users">Max Users</Label>
                <Input
                  id="max_users"
                  type="number"
                  value={newTenant.max_users}
                  onChange={(e) => setNewTenant({ ...newTenant, max_users: parseInt(e.target.value) })}
                  placeholder="Enter max users"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createTenant}>Create Tenant</Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                </div>
                <Badge variant={tenant.is_active ? "default" : "secondary"}>
                  {tenant.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {tenant.subdomain && (
                <CardDescription>{tenant.subdomain}.vibepos.com</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">{tenant.plan_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Users</p>
                  <p className="font-medium">{tenant.max_users}</p>
                </div>
              </div>
              
              {tenant.contact_email && (
                <div>
                  <p className="text-muted-foreground text-sm">Contact</p>
                  <p className="text-sm">{tenant.contact_email}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openUsersDialog(tenant)}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleTenantStatus(tenant)}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {tenant.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Users - {selectedTenant?.name}</DialogTitle>
            <DialogDescription>
              View and manage users for this tenant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {tenantUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found for this tenant</p>
            ) : (
              <div className="space-y-2">
                {tenantUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">User ID: {user.user_id}</p>
                      <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}