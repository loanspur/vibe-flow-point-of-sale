import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Plus, 
  DollarSign, 
  Smartphone, 
  Banknote, 
  Zap,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

export function PaymentManagement() {
  const { businessSettings } = useApp();

  // Mock data for payment methods
  const paymentMethods = [
    {
      id: '1',
      name: 'Cash',
      type: 'cash',
      is_active: true,
      processing_fee_percentage: 0,
      minimum_amount: 0,
    },
    {
      id: '2',
      name: 'Credit Card',
      type: 'card',
      is_active: true,
      processing_fee_percentage: 2.5,
      minimum_amount: 1,
    },
    {
      id: '3',
      name: 'M-Pesa',
      type: 'mobile_money',
      is_active: true,
      processing_fee_percentage: 1.0,
      minimum_amount: 5,
    }
  ];

  // Mock data for integrations
  const integrations = [
    {
      id: '1',
      name: 'Stripe',
      provider: 'stripe',
      is_active: true,
      is_test_mode: true,
      currency_code: 'USD',
    },
    {
      id: '2',
      name: 'Paystack',
      provider: 'paystack',
      is_active: false,
      is_test_mode: true,
      currency_code: 'KES',
    }
  ];

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
                <Button>
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
                            {method.processing_fee_percentage > 0 && ` ${method.processing_fee_percentage}% fee`}
                            {method.minimum_amount > 0 && ` • Min: ${businessSettings?.currency_symbol}${method.minimum_amount}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={method.is_active ? 'default' : 'secondary'}>
                          {method.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
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
                <Button>
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}