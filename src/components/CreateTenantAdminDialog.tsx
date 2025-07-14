import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;

interface CreateTenantAdminDialogProps {
  onUserCreated?: () => void;
}

export default function CreateTenantAdminDialog({ onUserCreated }: CreateTenantAdminDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    tenantId: '',
    role: 'admin' as 'admin' | 'manager'
  });

  useEffect(() => {
    if (open) {
      fetchTenants();
    }
  }, [open]);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenants",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.fullName || !formData.tenantId) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Create the user account using regular signup
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
            role: formData.role,
            tenant_id: formData.tenantId
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // The profile will be created automatically by the trigger
      // We need to update it with the proper role and tenant after creation
      
      // Give it a moment for the trigger to execute
      setTimeout(async () => {
        try {
          // Update the user's profile with role and tenant
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              role: formData.role,
              tenant_id: formData.tenantId,
              full_name: formData.fullName
            })
            .eq('user_id', authData.user.id);

          if (profileError) {
            console.error('Profile update error:', profileError);
          }

          // Add user to tenant_users table
          const { error: tenantUserError } = await supabase
            .from('tenant_users')
            .insert({
              user_id: authData.user.id,
              tenant_id: formData.tenantId,
              role: formData.role,
              is_active: true
            });

          if (tenantUserError) {
            console.error('Tenant user creation error:', tenantUserError);
          }
        } catch (updateError) {
          console.error('Error updating user after creation:', updateError);
        }
      }, 1000);

      toast({
        title: "Success",
        description: `Tenant ${formData.role} user created successfully`,
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        tenantId: '',
        role: 'admin'
      });

      setOpen(false);
      onUserCreated?.();

    } catch (error: any) {
      console.error('Error creating tenant admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant admin user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Tenant Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Tenant Admin User</DialogTitle>
          <DialogDescription>
            Create a new admin or manager user for a tenant
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@company.com"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Secure password"
              minLength={6}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tenant">Tenant</Label>
            <Select value={formData.tenantId} onValueChange={(value) => setFormData({ ...formData, tenantId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value: 'admin' | 'manager') => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}