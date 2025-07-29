import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  Smartphone, 
  Banknote, 
  Shield,
  Settings,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const paymentMethodSchema = z.object({
  name: z.string().min(1, 'Payment method name is required'),
  type: z.enum(['cash', 'card', 'mobile_money', 'bank_transfer', 'crypto', 'other']),
  is_active: z.boolean().default(true),
  requires_reference: z.boolean().default(false),
  description: z.string().optional(),
  processing_fee_percentage: z.number().min(0).max(100).default(0),
  minimum_amount: z.number().min(0).default(0),
  maximum_amount: z.number().optional(),
});

const integrationSchema = z.object({
  name: z.string().min(1, 'Integration name is required'),
  provider: z.enum(['stripe', 'paystack', 'mpesa', 'flutterwave', 'paypal', 'square', 'other']),
  api_key: z.string().optional(),
  secret_key: z.string().optional(),
  webhook_url: z.string().optional(),
  is_active: z.boolean().default(true),
  is_test_mode: z.boolean().default(true),
  currency_code: z.string().default('USD'),
  description: z.string().optional(),
});

interface PaymentMethod {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  is_active: boolean;
  requires_reference: boolean;
  description?: string;
  processing_fee_percentage: number;
  minimum_amount: number;
  maximum_amount?: number;
  created_at: string;
  updated_at: string;
}

interface PaymentIntegration {
  id: string;
  tenant_id: string;
  name: string;
  provider: string;
  api_key?: string;
  secret_key?: string;
  webhook_url?: string;
  is_active: boolean;
  is_test_mode: boolean;
  currency_code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function PaymentManagement() {
  const { user, tenantId } = useAuth();
  const { businessSettings } = useApp();
  const { toast } = useToast();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [integrations, setIntegrations] = useState<PaymentIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<PaymentIntegration | null>(null);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});

  const methodForm = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      name: '',
      type: 'cash',
      is_active: true,
      requires_reference: false,
      processing_fee_percentage: 0,
      minimum_amount: 0,
    }
  });

  const integrationForm = useForm<z.infer<typeof integrationSchema>>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: '',
      provider: 'stripe',
      is_active: true,
      is_test_mode: true,
      currency_code: businessSettings?.currency_code || 'USD',
    }
  });

  useEffect(() => {
    if (tenantId) {
      fetchPaymentMethods();
      fetchIntegrations();
    }
  }, [tenantId]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment methods',
        variant: 'destructive',
      });
    }
  };

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment integrations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentMethod = async (values: z.infer<typeof paymentMethodSchema>) => {
    try {
      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update(values)
          .eq('id', editingMethod.id);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Payment method updated successfully' });
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({ ...values, tenant_id: tenantId });
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Payment method created successfully' });
      }
      
      setShowMethodDialog(false);
      setEditingMethod(null);
      methodForm.reset();
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment method',
        variant: 'destructive',
      });
    }
  };

  const handleSaveIntegration = async (values: z.infer<typeof integrationSchema>) => {
    try {
      if (editingIntegration) {
        const { error } = await supabase
          .from('payment_integrations')
          .update(values)
          .eq('id', editingIntegration.id);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Integration updated successfully' });
      } else {
        const { error } = await supabase
          .from('payment_integrations')
          .insert({ ...values, tenant_id: tenantId });
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Integration created successfully' });
      }
      
      setShowIntegrationDialog(false);
      setEditingIntegration(null);
      integrationForm.reset();
      fetchIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save integration',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Success', description: 'Payment method deleted successfully' });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payment method',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_integrations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Success', description: 'Integration deleted successfully' });
      fetchIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete integration',
        variant: 'destructive',
      });
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'mobile_money': return <Smartphone className="h-4 w-4" />;
      case 'bank_transfer': return <DollarSign className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'stripe': return '🟦';
      case 'paystack': return '🟨';
      case 'mpesa': return '📱';
      case 'flutterwave': return '🟧';
      case 'paypal': return '🟦';
      default: return '⚡';
    }
  };

  const toggleSecretVisibility = (integrationId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payment Management</h2>
          <p className="text-muted-foreground">
            Configure payment methods and third-party integrations
          </p>
        </div>
      </div>

      <Tabs defaultValue="methods" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="methods" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Third-Party Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Manage accepted payment methods for sales and purchases
                  </CardDescription>
                </div>
                <Dialog open={showMethodDialog} onOpenChange={setShowMethodDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingMethod ? 'Edit' : 'Add'} Payment Method
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...methodForm}>
                      <form onSubmit={methodForm.handleSubmit(handleSavePaymentMethod)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={methodForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Method Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Cash, Visa, M-Pesa" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={methodForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={methodForm.control}
                            name="processing_fee_percentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Processing Fee (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={methodForm.control}
                            name="minimum_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Minimum Amount</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-center space-x-4">
                          <FormField
                            control={methodForm.control}
                            name="is_active"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel>Active</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={methodForm.control}
                            name="requires_reference"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel>Requires Reference</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowMethodDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingMethod ? 'Update' : 'Create'} Method
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No payment methods configured. Add one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getPaymentMethodIcon(method.type)}
                          <div>
                            <h4 className="font-medium">{method.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {method.type.replace('_', ' ')} • 
                              {method.processing_fee_percentage > 0 && ` ${method.processing_fee_percentage}% fee`}
                              {method.minimum_amount > 0 && ` • Min: ${businessSettings?.currency_symbol}${method.minimum_amount}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={method.is_active ? 'default' : 'secondary'}>
                            {method.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMethod(method);
                              methodForm.reset(method);
                              setShowMethodDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePaymentMethod(method.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Third-Party Integrations</CardTitle>
                  <CardDescription>
                    Configure payment gateways and external payment services
                  </CardDescription>
                </div>
                <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingIntegration ? 'Edit' : 'Add'} Payment Integration
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...integrationForm}>
                      <form onSubmit={integrationForm.handleSubmit(handleSaveIntegration)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={integrationForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Integration Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Stripe Payments" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={integrationForm.control}
                            name="provider"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Provider</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="stripe">Stripe</SelectItem>
                                    <SelectItem value="paystack">Paystack</SelectItem>
                                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                                    <SelectItem value="flutterwave">Flutterwave</SelectItem>
                                    <SelectItem value="paypal">PayPal</SelectItem>
                                    <SelectItem value="square">Square</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={integrationForm.control}
                            name="api_key"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Key (Public)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="pk_..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={integrationForm.control}
                            name="secret_key"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secret Key</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" placeholder="sk_..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={integrationForm.control}
                          name="webhook_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Webhook URL</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center space-x-4">
                          <FormField
                            control={integrationForm.control}
                            name="is_active"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel>Active</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={integrationForm.control}
                            name="is_test_mode"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel>Test Mode</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowIntegrationDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingIntegration ? 'Update' : 'Create'} Integration
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {integrations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No payment integrations configured. Add one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getProviderIcon(integration.provider)}</span>
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {integration.name}
                              {integration.is_test_mode && (
                                <Badge variant="outline" className="text-xs">TEST</Badge>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {integration.provider} • {integration.currency_code}
                              {integration.api_key && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                  • API: {showSecrets[integration.id] ? integration.api_key : '••••••••'}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 p-0"
                                    onClick={() => toggleSecretVisibility(integration.id)}
                                  >
                                    {showSecrets[integration.id] ? 
                                      <EyeOff className="h-3 w-3" /> : 
                                      <Eye className="h-3 w-3" />
                                    }
                                  </Button>
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                            {integration.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingIntegration(integration);
                              integrationForm.reset(integration);
                              setShowIntegrationDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteIntegration(integration.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}