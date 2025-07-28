import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CreateTenantWithAdminDialogProps {
  onTenantCreated?: () => void;
}

export default function CreateTenantWithAdminDialog({ onTenantCreated }: CreateTenantWithAdminDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Tenant fields
    tenantName: '',
    subdomain: '',
    planType: 'basic',
    maxUsers: 10,
    
    // Admin user fields
    adminEmail: '',
    adminPassword: '',
    adminFullName: '',
    adminRole: 'admin' as 'admin' | 'manager'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenantName || !formData.adminEmail || !formData.adminPassword || !formData.adminFullName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Send verification email for admin-created tenants
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: formData.adminEmail,
          fullName: formData.adminFullName,
          businessName: formData.tenantName,
          password: formData.adminPassword,
          planId: null, // Admin created, no specific plan
          isAdminCreated: true
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send verification email');
      }

      toast({
        title: "Success",
        description: `Verification email sent to ${formData.adminEmail}. The tenant will be created once they verify their email.`,
      });

      // Reset form
      setFormData({
        tenantName: '',
        subdomain: '',
        planType: 'basic',
        maxUsers: 10,
        adminEmail: '',
        adminPassword: '',
        adminFullName: '',
        adminRole: 'admin'
      });

      setOpen(false);
      onTenantCreated?.();

    } catch (error: any) {
      console.error('Error creating tenant with admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant and admin user",
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
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant & Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Tenant with Admin User</DialogTitle>
          <DialogDescription>
            Create a new tenant and its admin user in one go
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Information Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <h3 className="text-lg font-semibold">Tenant Information</h3>
            </div>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantName">Tenant Name *</Label>
                <Input
                  id="tenantName"
                  value={formData.tenantName}
                  onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                  placeholder="Company Name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subdomain">Subdomain *</Label>
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="company-name"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Will create: {formData.subdomain || 'subdomain'}.vibepos.shop
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="planType">Plan Type</Label>
                  <Select value={formData.planType} onValueChange={(value) => setFormData({ ...formData, planType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Admin User Information Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-secondary"></div>
              <h3 className="text-lg font-semibold">Admin User Information</h3>
            </div>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="adminFullName">Full Name *</Label>
                <Input
                  id="adminFullName"
                  value={formData.adminFullName}
                  onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminEmail">Email Address *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@company.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminPassword">Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  placeholder="Secure password"
                  minLength={6}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminRole">Admin Role</Label>
                <Select value={formData.adminRole} onValueChange={(value: 'admin' | 'manager') => setFormData({ ...formData, adminRole: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Tenant & Admin"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}