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
import { Textarea } from '@/components/ui/textarea';
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

// Schema definitions
const paymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "card", "mobile_money", "bank_transfer", "crypto", "other"]),
  account_id: z.string().uuid("Please select an accounting account"),
  is_active: z.boolean().default(true),
  requires_reference: z.boolean().default(false),
  description: z.string().optional(),
  processing_fee_percentage: z.number().min(0).max(100).optional(),
  minimum_amount: z.number().min(0).optional(),
  maximum_amount: z.number().min(0).optional(),
});

const integrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.enum(["stripe", "paystack", "paypal", "square", "mpesa", "flutterwave", "other"]),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
  api_key: z.string().optional(),
  secret_key: z.string().optional(),
  webhook_url: z.string().url().optional().or(z.literal("")),
  is_test_mode: z.boolean().default(true),
  currency_code: z.string().default("KES"),
});

// Interface definitions - temporary until types are regenerated
interface PaymentMethod {
  id: string;
  tenant_id: string;
  name: string;
  type: "cash" | "card" | "mobile_money" | "bank_transfer" | "crypto" | "other";
  account_id?: string;
  account_name?: string;
  account_code?: string;
  is_active: boolean;
  requires_reference: boolean;
  description?: string;
  processing_fee_percentage?: number;
  minimum_amount?: number;
  maximum_amount?: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface AssetAccount {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface PaymentIntegration {
  id: string;
  tenant_id: string;
  name: string;
  provider: "stripe" | "paystack" | "paypal" | "square" | "mpesa" | "flutterwave" | "other";
  is_active: boolean;
  description?: string;
  api_key?: string;
  secret_key?: string;
  webhook_url?: string;
  is_test_mode: boolean;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export function PaymentManagement() {
  const { user, tenantId } = useAuth();
  const { businessSettings } = useApp();
  const { toast } = useToast();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [integrations, setIntegrations] = useState<PaymentIntegration[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
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
      account_id: '',
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
      currency_code: businessSettings?.currency_code || 'KES',
    }
  });

  useEffect(() => {
    if (tenantId) {
      fetchPaymentMethods();
      fetchIntegrations();
      fetchAssetAccounts();
    }
  }, [tenantId]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');

      if (error) throw error;
      
      // Enhance payment methods with account information
      const enhancedMethods = await Promise.all(
        (data || []).map(async (method: any) => {
          let account_name = '';
          let account_code = '';
          
          if (method.account_id) {
            const { data: accountData } = await supabase
              .from('accounts')
              .select('name, code')
              .eq('id', method.account_id)
              .maybeSingle();
              
            if (accountData) {
              account_name = accountData.name;
              account_code = accountData.code;
            }
          }
          
          return {
            ...method,
            account_name,
            account_code,
          };
        })
      );
      
      setPaymentMethods(enhancedMethods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payment methods',
        variant: 'destructive',
      });
    }
  };

  const fetchAssetAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          code,
          account_types!inner(category)
        `)
        .eq('tenant_id', tenantId)
        .eq('account_types.category', 'assets')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      
      const formattedAccounts = (data || []).map((account: any) => ({
        id: account.id,
        name: account.name,
        code: account.code,
        category: account.account_types?.category || 'assets'
      }));
      
      setAssetAccounts(formattedAccounts);
    } catch (error) {
      console.error('Error fetching asset accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch asset accounts',
        variant: 'destructive',
      });
    }
  };

  const fetchIntegrations = async () => {
    try {
      // Default integrations for demonstration
      const defaultIntegrations: PaymentIntegration[] = [
        {
          id: '1',
          tenant_id: tenantId || '',
          name: 'Stripe Gateway',
          provider: 'stripe',
          is_active: true,
          is_test_mode: true,
          currency_code: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: 'Global payment processing',
          api_key: 'pk_test_***',
        },
        {
          id: '2',
          tenant_id: tenantId || '',
          name: 'Paystack Kenya',
          provider: 'paystack',
          is_active: false,
          is_test_mode: true,
          currency_code: 'KES',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: 'Local payment gateway for Kenya',
        }
      ];
      setIntegrations(defaultIntegrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentMethod = async (values: z.infer<typeof paymentMethodSchema>) => {
    try {
      const paymentMethodData = {
        tenant_id: tenantId,
        name: values.name,
        type: values.type,
        account_id: values.account_id,
        is_active: values.is_active,
        requires_reference: values.requires_reference,
        description: values.description || null,
        processing_fee_percentage: values.processing_fee_percentage || null,
        minimum_amount: values.minimum_amount || null,
        maximum_amount: values.maximum_amount || null,
        display_order: editingMethod?.display_order || paymentMethods.length + 1,
      };

      let result;
      if (editingMethod) {
        // Update existing method
        result = await supabase
          .from('payment_methods')
          .update(paymentMethodData)
          .eq('id', editingMethod.id)
          .eq('tenant_id', tenantId)
          .select();
          
        toast({ 
          title: 'Success', 
          description: 'Payment method updated successfully' 
        });
      } else {
        // Add new method
        result = await supabase
          .from('payment_methods')
          .insert([paymentMethodData])
          .select();
          
        toast({ 
          title: 'Success', 
          description: 'Payment method created successfully' 
        });
      }
      
      if (result.error) throw result.error;
      
      // Refresh the payment methods list
      await fetchPaymentMethods();
      
      setShowMethodDialog(false);
      setEditingMethod(null);
      methodForm.reset();
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
      // For demonstration purposes - simulate saving to database
      const newIntegration: PaymentIntegration = {
        id: editingIntegration?.id || Date.now().toString(),
        tenant_id: tenantId || '',
        name: values.name,
        provider: values.provider,
        is_active: values.is_active,
        description: values.description,
        api_key: values.api_key,
        secret_key: values.secret_key,
        webhook_url: values.webhook_url,
        is_test_mode: values.is_test_mode,
        currency_code: values.currency_code,
        created_at: editingIntegration?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (editingIntegration) {
        // Update existing integration
        setIntegrations(prev => 
          prev.map(integration => integration.id === editingIntegration.id ? newIntegration : integration)
        );
        toast({ 
          title: 'Success', 
          description: 'Integration updated successfully' 
        });
      } else {
        // Add new integration
        setIntegrations(prev => [...prev, newIntegration]);
        toast({ 
          title: 'Success', 
          description: 'Integration created successfully' 
        });
      }
      
      setShowIntegrationDialog(false);
      setEditingIntegration(null);
      integrationForm.reset();
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
        .eq('id', id)
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      
      // Refresh the payment methods list
      await fetchPaymentMethods();
      
      toast({ title: 'Success', description: 'Payment method deleted successfully' });
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
      // For demonstration purposes - simulate deleting from database
      setIntegrations(prev => prev.filter(integration => integration.id !== id));
      toast({ title: 'Success', description: 'Integration deleted successfully' });
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

  const openMethodDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      methodForm.reset({
        name: method.name,
        type: method.type,
        account_id: method.account_id || '',
        is_active: method.is_active,
        requires_reference: method.requires_reference,
        description: method.description || '',
        processing_fee_percentage: method.processing_fee_percentage || 0,
        minimum_amount: method.minimum_amount || 0,
        maximum_amount: method.maximum_amount || undefined,
      });
    } else {
      setEditingMethod(null);
      methodForm.reset();
    }
    setShowMethodDialog(true);
  };

  const openIntegrationDialog = (integration?: PaymentIntegration) => {
    if (integration) {
      setEditingIntegration(integration);
      integrationForm.reset({
        name: integration.name,
        provider: integration.provider,
        is_active: integration.is_active,
        description: integration.description || '',
        api_key: integration.api_key || '',
        secret_key: integration.secret_key || '',
        webhook_url: integration.webhook_url || '',
        is_test_mode: integration.is_test_mode,
        currency_code: integration.currency_code,
      });
    } else {
      setEditingIntegration(null);
      integrationForm.reset();
    }
    setShowIntegrationDialog(true);
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
                <Button onClick={() => openMethodDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Method
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                            {method.account_name && `Account: ${method.account_code} - ${method.account_name}`}
                            {method.processing_fee_percentage && method.processing_fee_percentage > 0 && ` • ${method.processing_fee_percentage}% fee`}
                            {method.minimum_amount && method.minimum_amount > 0 && ` • Min: ${businessSettings?.currency_symbol}${method.minimum_amount}`}
                            {method.requires_reference && ' • Requires Reference'}
                          </p>
                          {method.description && (
                            <p className="text-xs text-muted-foreground mt-1">{method.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={method.is_active ? 'default' : 'secondary'}>
                          {method.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => openMethodDialog(method)}>
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
                <Button onClick={() => openIntegrationDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                          </p>
                          {integration.description && (
                            <p className="text-xs text-muted-foreground mt-1">{integration.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => openIntegrationDialog(integration)}>
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
                {integrations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment integrations configured yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Method Dialog */}
      <Dialog open={showMethodDialog} onOpenChange={setShowMethodDialog}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

              <FormField
                control={methodForm.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Associated Asset Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an asset account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span>{account.code} - {account.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      This account will be used for accounting transactions when this payment method is used
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={methodForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional details about this payment method" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
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
                <FormField
                  control={methodForm.control}
                  name="maximum_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
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
                      <FormLabel>Requires Reference Number</FormLabel>
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

      {/* Integration Dialog */}
      <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
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
                        <Input {...field} placeholder="e.g., Stripe Payment Gateway" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="paystack">Paystack</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="mpesa">M-Pesa</SelectItem>
                          <SelectItem value="flutterwave">Flutterwave</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={integrationForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional details about this integration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={integrationForm.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Enter API key" />
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
                      <FormLabel>Secret Key (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Enter secret key" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={integrationForm.control}
                  name="webhook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://your-site.com/webhook" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={integrationForm.control}
                  name="currency_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="KES, USD, EUR, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
  );
}