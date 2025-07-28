import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Building2, Users, Settings, Trash2, AlertCircle, CreditCard, ArrowUpCircle, ArrowDownCircle, RefreshCw, Mail } from 'lucide-react';
import CreateTenantWithAdminDialog from '@/components/CreateTenantWithAdminDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type TenantUser = Tables<'tenant_users'>;
type BillingPlan = Tables<'billing_plans'>;
type TenantSubscription = Tables<'tenant_subscription_details'> & {
  billing_plans?: {
    id: string;
    name: string;
    price: number;
    period: string;
    badge: string;
    badge_color: string;
  };
};

export default function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [tenantSubscriptions, setTenantSubscriptions] = useState<TenantSubscription[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
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
    max_users: 10,
    billing_plan_id: '',
    country: 'Kenya'
  });

  useEffect(() => {
    // Check user permissions before fetching data
    const checkPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error || !profile || profile.role !== 'superadmin') {
          setError('You do not have permission to access tenant management.');
          setLoading(false);
          return;
        }

        // If user is superadmin, proceed with data fetching
        await Promise.all([
          fetchTenants(),
          fetchBillingPlans(), 
          fetchTenantSubscriptions()
        ]);
      } catch (err: any) {
        setError(err.message || 'Permission check failed');
        setLoading(false);
      }
    };

    checkPermissions();
  }, [user]);

  const fetchTenants = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          profiles!tenants_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch tenants error:', error);
        setError(error.message);
        return;
      }

      // Fetch tenant domains separately to avoid relationship issues
      const tenantsWithDomains = await Promise.all(
        (data || []).map(async (tenant) => {
          const { data: domains } = await supabase
            .from('tenant_domains')
            .select('domain_name, domain_type, is_primary')
            .eq('tenant_id', tenant.id);
          
          return {
            ...tenant,
            tenant_domains: domains || []
          };
        })
      );

      setTenants(tenantsWithDomains);
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
      // Get billing plan ID based on plan type
      const { data: billingPlan, error: planError } = await supabase
        .from('billing_plans')
        .select('id')
        .ilike('name', `%${newTenant.plan_type}%`)
        .eq('is_active', true)
        .single();

      if (planError || !billingPlan) {
        throw new Error(`Invalid plan type: ${newTenant.plan_type}`);
      }

      const { data, error } = await supabase
        .from('tenants')
        .insert([{
          ...newTenant,
          billing_plan_id: billingPlan.id,
          status: 'active',
          created_by: user?.id,
          country: 'Kenya' // Default country
        }])
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
        max_users: 10,
        billing_plan_id: '',
        country: 'Kenya'
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

  const fetchBillingPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setBillingPlans(data || []);
    } catch (error) {
      console.error('Failed to fetch billing plans:', error);
    }
  };

  const fetchTenantSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_subscription_details')
        .select(`
          *,
          billing_plans (
            id, name, price, period, badge, badge_color
          )
        `)
        .in('status', ['active', 'pending']);

      if (error) throw error;
      setTenantSubscriptions(data || []);
    } catch (error) {
      console.error('Failed to fetch tenant subscriptions:', error);
    }
  };

  const openSubscriptionDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    const subscription = tenantSubscriptions.find(sub => sub.tenant_id === tenant.id);
    setSelectedSubscription(subscription || null);
    setSubscriptionDialogOpen(true);
  };

  const updateSubscription = async (tenantId: string, newPlanId: string) => {
    setSubscriptionLoading(true);
    try {
      // Check if tenant has existing subscription
      const existingSubscription = tenantSubscriptions.find(sub => sub.tenant_id === tenantId);
      
      if (existingSubscription) {
        // Update existing subscription
        const { error } = await supabase
          .from('tenant_subscription_details')
          .update({
            billing_plan_id: newPlanId,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('tenant_subscription_details')
          .insert({
            tenant_id: tenantId,
            billing_plan_id: newPlanId,
            status: 'active',
            current_period_start: new Date().toISOString().split('T')[0],
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            next_billing_amount: billingPlans.find(plan => plan.id === newPlanId)?.price || 0
          });

        if (error) throw error;
      }

      // Refresh data
      await fetchTenantSubscriptions();
      setSubscriptionDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Subscription updated successfully"
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const sendWelcomeEmail = async (tenant: Tenant) => {
    if (!tenant.contact_email) {
      toast({
        title: "Error",
        description: "No contact email found for this tenant",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Sending welcome email to:', tenant.contact_email, 'for tenant:', tenant.name);
      
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          tenantName: tenant.name,
          contactEmail: tenant.contact_email,
          tenantId: tenant.id
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Welcome email sent to ${tenant.contact_email}`,
      });
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send welcome email",
        variant: "destructive"
      });
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">Manage tenants and their configurations</p>
        </div>
        
        <div className="flex gap-2">
          <CreateTenantWithAdminDialog onTenantCreated={fetchTenants} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Current Plan</TableHead>
                <TableHead>Subscription Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const subscription = tenantSubscriptions.find(sub => sub.tenant_id === tenant.id);
                
                return (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const subdomain = (tenant as any).tenant_domains?.find((d: any) => d.domain_type === 'subdomain')?.domain_name;
                        return subdomain ? (
                          <span className="text-sm text-muted-foreground">{subdomain}</span>
                        ) : tenant.subdomain ? (
                          <span className="text-sm text-muted-foreground">{tenant.subdomain}.vibepos.shop</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {subscription?.billing_plans ? (
                        <div className="flex items-center gap-2">
                          <Badge className={subscription.billing_plans.badge_color}>
                            {subscription.billing_plans.badge}
                          </Badge>
                          <span className="text-sm">{subscription.billing_plans.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No Plan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subscription ? (
                        <Badge variant={subscription.status === 'active' ? "default" : "secondary"}>
                          {subscription.status === 'active' ? 'Active' : subscription.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Subscription</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.contact_email ? (
                        <span className="text-sm">{tenant.contact_email}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.country ? (
                        <span className="text-sm">{tenant.country}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(tenant as any).created_by_profile?.full_name ? (
                        <span className="text-sm">{(tenant as any).created_by_profile.full_name}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(tenant.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.is_active ? "default" : "secondary"}>
                        {tenant.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSubscriptionDialog(tenant)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          {subscription ? 'Manage Plan' : 'Add Plan'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUsersDialog(tenant)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Users
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendWelcomeEmail(tenant)}
                          disabled={!tenant.contact_email}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Welcome Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTenantStatus(tenant)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          {tenant.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      {/* Subscription Management Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Manage Subscription - {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription>
              Upgrade, downgrade, or manage the subscription plan for this tenant
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Plan Display */}
            {selectedSubscription && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">Current Plan</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={selectedSubscription.billing_plans?.badge_color}>
                      {selectedSubscription.billing_plans?.badge}
                    </Badge>
                    <div>
                      <p className="font-medium">{selectedSubscription.billing_plans?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        KES {selectedSubscription.billing_plans?.price.toLocaleString()} per {selectedSubscription.billing_plans?.period}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedSubscription.status === 'active' ? "default" : "secondary"}>
                      {selectedSubscription.status}
                    </Badge>
                  </div>
                </div>
                {selectedSubscription.next_billing_date && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Next billing: {new Date(selectedSubscription.next_billing_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            
            {/* Available Plans */}
            <div>
              <h3 className="font-semibold mb-4">
                {selectedSubscription ? 'Change Plan' : 'Select Plan'}
              </h3>
              <div className="grid gap-4">
                {billingPlans.map((plan) => {
                  const isCurrentPlan = selectedSubscription?.billing_plan_id === plan.id;
                  const currentPlanPrice = selectedSubscription?.billing_plans?.price || 0;
                  const isUpgrade = plan.price > currentPlanPrice;
                  const isDowngrade = plan.price < currentPlanPrice;
                  
                  return (
                    <div
                      key={plan.id}
                      className={`p-4 border rounded-lg transition-all ${
                        isCurrentPlan 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={plan.badge_color}>
                            {plan.badge}
                          </Badge>
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {plan.name}
                              {isCurrentPlan && (
                                <Badge variant="outline" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              KES {plan.price.toLocaleString()} per {plan.period}
                            </p>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {plan.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {selectedSubscription && !isCurrentPlan && (
                            <div className="text-right mr-3">
                              {isUpgrade && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <ArrowUpCircle className="h-4 w-4" />
                                  <span className="text-xs">Upgrade</span>
                                </div>
                              )}
                              {isDowngrade && (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <ArrowDownCircle className="h-4 w-4" />
                                  <span className="text-xs">Downgrade</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <Button
                            variant={isCurrentPlan ? "secondary" : "outline"}
                            size="sm"
                            disabled={isCurrentPlan || subscriptionLoading}
                            onClick={() => selectedTenant && updateSubscription(selectedTenant.id, plan.id)}
                          >
                            {subscriptionLoading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : isCurrentPlan ? (
                              'Current Plan'
                            ) : selectedSubscription ? (
                              isUpgrade ? 'Upgrade' : 'Downgrade'
                            ) : (
                              'Select Plan'
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Plan Features */}
                      {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="grid grid-cols-2 gap-2">
                            {(plan.features as any[]).slice(0, 6).map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${
                                  feature.included ? 'bg-green-500' : 'bg-gray-300'
                                }`} />
                                <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                                  {feature.name}
                                  {feature.limit && feature.limit !== 'unlimited' && ` (${feature.limit})`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Notes */}
            <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Plan changes take effect immediately</li>
                <li>Upgrades will be prorated for the current billing period</li>
                <li>Downgrades will apply at the next billing cycle</li>
                <li>All plan changes will be reflected in the next invoice</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}