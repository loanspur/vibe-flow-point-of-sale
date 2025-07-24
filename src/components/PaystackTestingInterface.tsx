import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Star,
  Users,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: any;
  badge?: string;
  badge_color?: string;
  pricing?: any;
}

interface PaymentTestResult {
  status: 'pending' | 'success' | 'failed';
  message: string;
  reference?: string;
  amount?: number;
  plan?: string;
  timestamp: string;
}

const TEST_CARDS = [
  { number: '4084084084084081', type: 'Successful Transaction', status: 'success' },
  { number: '4000000000000002', type: 'Failed Transaction', status: 'failed' },
  { number: '4000000000000069', type: 'Expired Card', status: 'failed' },
  { number: '4000000000000127', type: 'Incorrect CVC', status: 'failed' }
];

export default function PaystackTestingInterface() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatPrice, currencyCode, currencySymbol } = useCurrencyUpdate();
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<PaymentTestResult[]>([]);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');

  useEffect(() => {
    fetchBillingPlans();
  }, []);

  const fetchBillingPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      setBillingPlans(data || []);
      if (data && data.length > 0) {
        setSelectedPlan(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch billing plans: " + error.message,
        variant: "destructive"
      });
    }
  };

  const initiatePaystackCheckout = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please login first to test payments",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "Error", 
        description: "Please select a billing plan",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const testResult: PaymentTestResult = {
      status: 'pending',
      message: 'Initiating Paystack checkout...',
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [testResult, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke('create-paystack-checkout', {
        body: { planId: selectedPlan }
      });

      if (error) throw error;

      if (data.authorization_url) {
        setCheckoutUrl(data.authorization_url);
        const successResult: PaymentTestResult = {
          status: 'success',
          message: 'Checkout session created successfully!',
          reference: data.reference,
          plan: billingPlans.find(p => p.id === selectedPlan)?.name,
          timestamp: new Date().toISOString()
        };
        setTestResults(prev => [successResult, ...prev.slice(1)]);
        
        toast({
          title: "Success",
          description: "Paystack checkout created! Click 'Open Paystack' to test payment."
        });
      }
    } catch (error: any) {
      const failResult: PaymentTestResult = {
        status: 'failed',
        message: error.message || 'Failed to create checkout session',
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => [failResult, ...prev.slice(1)]);
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    setLoading(true);
    const verifyResult: PaymentTestResult = {
      status: 'pending',
      message: 'Verifying payment with Paystack...',
      reference,
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [verifyResult, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: { reference }
      });

      if (error) throw error;

      const successResult: PaymentTestResult = {
        status: 'success',
        message: data.message || 'Payment verified successfully!',
        reference,
        timestamp: new Date().toISOString(),
        amount: data.subscription?.amount,
        plan: data.subscription?.plan_name
      };
      setTestResults(prev => [successResult, ...prev.slice(1)]);

      toast({
        title: "Payment Verified",
        description: `${data.message} - Status: ${data.subscription?.status}`,
        variant: "default"
      });
    } catch (error: any) {
      const failResult: PaymentTestResult = {
        status: 'failed',
        message: `Verification failed: ${error.message}`,
        reference,
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => [failResult, ...prev.slice(1)]);
      
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = billingPlans.find(p => p.id === selectedPlan);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Paystack Payment Testing Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              This interface allows you to test the complete Paystack payment flow with {currencyCode} pricing. 
              Use the test cards below for different payment scenarios.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="plans">Select Plan</TabsTrigger>
              <TabsTrigger value="payment">Test Payment</TabsTrigger>
              <TabsTrigger value="results">Test Results</TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-4">
              <h3 className="text-lg font-semibold">Available Billing Plans ({currencyCode})</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {billingPlans.map((plan) => (
                  <Card 
                    key={plan.id}
                    className={`cursor-pointer transition-all ${
                      selectedPlan === plan.id 
                        ? 'ring-2 ring-primary border-primary bg-primary/5' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.badge && (
                          <Badge className={plan.badge_color || 'bg-blue-100 text-blue-800'}>
                            <Star className="h-3 w-3 mr-1" />
                            {plan.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <span className="text-2xl font-bold">{formatPrice(plan.price)}</span>
                        <span className="text-muted-foreground">/{plan.period}</span>
                      </div>
                      
                      {plan.pricing && (
                        <div className="text-xs text-muted-foreground mb-3">
                          <div>Quarterly: {formatPrice(plan.pricing.quarterly || 0)}</div>
                          <div>Annually: {formatPrice(plan.pricing.annually || 0)}</div>
                        </div>
                      )}

                      <ul className="space-y-1">
                        {Array.isArray(plan.features) && plan.features?.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center text-xs">
                            <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                            {typeof feature === 'string' ? feature : feature.name || feature.feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPlanData ? (
                      <div className="space-y-2">
                        <div className="text-lg font-semibold">{selectedPlanData.name}</div>
                        <div className="text-2xl font-bold text-primary">
                          {formatPrice(selectedPlanData.price)}
                          <span className="text-sm text-muted-foreground font-normal">/{selectedPlanData.period}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedPlanData.description}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No plan selected</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Test Cards (Paystack)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {TEST_CARDS.map((card, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded text-xs">
                          <div>
                            <div className="font-mono">{card.number}</div>
                            <div className="text-muted-foreground">{card.type}</div>
                          </div>
                          <Badge className={card.status === 'success' ? 'bg-green-500' : 'bg-red-500'}>
                            {card.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={initiatePaystackCheckout}
                  disabled={loading || !selectedPlan}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Checkout...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Create Paystack Checkout
                    </>
                  )}
                </Button>

                {checkoutUrl && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => window.open(checkoutUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Paystack
                    </Button>
                    
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        const lastResult = testResults.find(r => r.reference);
                        if (lastResult?.reference) {
                          verifyPayment(lastResult.reference);
                        }
                      }}
                      disabled={!testResults.find(r => r.reference)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Verification
                    </Button>
                  </>
                )}
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Quick Test References:</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => verifyPayment('sub_11111111-1111-1111-1111-111111111111_1753389130340')}
                  >
                    Test Enterprise Plan Verification
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => verifyPayment('sub_11111111-1111-1111-1111-111111111111_1753388914291')}
                  >
                    Test Professional Plan Verification
                  </Button>
                </div>
              </div>

              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  <strong>Test Instructions:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Click "Create Paystack Checkout" to generate a payment session</li>
                    <li>Click "Open Paystack" to open the payment page in a new tab</li>
                    <li>Use any of the test card numbers above</li>
                    <li>Use any future date for expiry (e.g., 12/25)</li>
                    <li>Use any 3-digit CVV (e.g., 123)</li>
                    <li>Check the webhook will update the subscription status</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Test Results History</h3>
                <Button variant="outline" size="sm" onClick={() => setTestResults([])}>
                  Clear History
                </Button>
              </div>
              
              {testResults.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">No test results yet. Start a payment test to see results here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {result.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                            {result.status === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
                            
                            <div>
                              <div className="font-medium">{result.message}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(result.timestamp).toLocaleString()}
                                {result.plan && ` • ${result.plan}`}
                                {result.reference && ` • Ref: ${result.reference}`}
                              </div>
                            </div>
                          </div>
                          
                          {result.reference && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => verifyPayment(result.reference!)}
                            >
                              Verify Payment
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}