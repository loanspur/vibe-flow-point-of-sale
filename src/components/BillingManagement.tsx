import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: Array<{ name: string; included: boolean }>;
  badge?: string;
  badge_color?: string;
  popularity: number;
  original_price?: number;
}

interface TenantSubscription {
  id: string;
  billing_plan_id: string;
  status: string;
  amount?: number;
  currency?: string;
  reference?: string;
  expires_at?: string;
  trial_start?: string;
  trial_end?: string;
  current_period_start?: string;
  current_period_end?: string;
  next_billing_date?: string;
  is_prorated_period?: boolean;
  billing_day?: number;
  next_billing_amount?: number;
  billing_plans?: {
    id: string;
    name: string;
    price: number;
    period: string;
  };
}

interface TenantCustomPricing {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  custom_amount: number;
  original_amount: number;
  discount_percentage?: number;
  setup_fee?: number;
  reason: string;
  effective_date: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  payment_reference: string;
  payment_status: string;
  payment_type: string;
  created_at: string;
  paid_at?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  is_prorated?: boolean;
  full_period_amount?: number;
  proration_start_date?: string;
  proration_end_date?: string;
  prorated_days?: number;
  billing_plans?: {
    name: string;
    price: number;
    period: string;
  };
}

export default function BillingManagement() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const { formatPrice, currencySymbol, currencyCode, updateCounter } = useCurrencyUpdate();
  
  // Debug logging to check currency values
  console.log('BillingManagement - Currency Debug:', { 
    currencySymbol, 
    currencyCode, 
    updateCounter,
    sampleFormat: formatPrice(120)
  });
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [convertedPlans, setConvertedPlans] = useState<BillingPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<TenantSubscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [customPricing, setCustomPricing] = useState<TenantCustomPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingPlans();
    fetchCurrentSubscription();
    fetchPaymentHistory();
    fetchCustomPricing();
  }, [tenantId]);

  // Re-fetch data when currency changes to ensure proper formatting
  useEffect(() => {
    if (updateCounter > 0) {
      fetchBillingPlans();
      fetchCurrentSubscription();
      fetchPaymentHistory();
      fetchCustomPricing();
    }
  }, [updateCounter]);

  // Fetch custom pricing when currentSubscription changes
  useEffect(() => {
    if (currentSubscription?.billing_plan_id) {
      fetchCustomPricing();
    }
  }, [currentSubscription]);

  const fetchBillingPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('id, name, price, period, features, badge, badge_color, popularity, original_price')
        .eq('is_active', true)
        .order('popularity', { ascending: false });

      if (error) throw error;
      
      const transformedPlans = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) 
          ? plan.features 
          : []
      })) as BillingPlan[];
      
      setBillingPlans(transformedPlans);
      setConvertedPlans(transformedPlans);
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      toast({
        title: "Error",
        description: "Failed to load billing plans",
        variant: "destructive"
      });
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      if (!tenantId) return;
      
      // First check tenant_subscription_details for current subscription info
      const { data: subscriptionDetails, error: detailsError } = await supabase
        .from('tenant_subscription_details')
        .select(`
          *,
          billing_plans (
            id,
            name,
            price,
            period
          )
        `)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (detailsError && detailsError.code !== 'PGRST116') throw detailsError;
      
      if (subscriptionDetails) {
        setCurrentSubscription({
          ...subscriptionDetails,
          billing_plans: subscriptionDetails.billing_plans
        } as TenantSubscription);
      } else {
        // Fallback to tenant_subscriptions for backward compatibility
        const { data, error } = await supabase
          .from('tenant_subscriptions')
          .select(`
            *,
            billing_plans (
              id,
              name,
              price,
              period
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setCurrentSubscription({
            ...data,
            billing_plans: data.billing_plans
          } as TenantSubscription);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      if (!tenantId) return;
      
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          billing_plans (
            name,
            price,
            period
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      if (data) {
        setPaymentHistory(data as PaymentHistory[]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const fetchCustomPricing = async () => {
    try {
      if (!tenantId || !currentSubscription?.billing_plan_id) return;
      
      const { data, error } = await supabase
        .from('tenant_custom_pricing')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('billing_plan_id', currentSubscription.billing_plan_id)
        .eq('is_active', true)
        .lte('effective_date', new Date().toISOString().split('T')[0])
        .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (!error && data) {
        setCustomPricing(data);
      }
    } catch (error) {
      console.error('Error fetching custom pricing:', error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Please ensure you're logged in",
        variant: "destructive"
      });
      return;
    }

    setUpgrading(planId);
    
    try {
      console.log('Calling create-paystack-checkout with planId:', planId);
      console.log('User:', user);
      console.log('Tenant ID:', tenantId);
      
      // Get the current session to ensure we have a valid JWT token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', sessionData);
      console.log('Session error:', sessionError);
      
      if (!sessionData?.session?.access_token) {
        throw new Error('No valid session found. Please log out and log back in.');
      }
      
      console.log('Making function call...');
      
      // Try direct fetch approach instead of supabase.functions.invoke
      const response = await fetch(`https://qwtybhvdbbkbcelisuek.supabase.co/functions/v1/create-paystack-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dHliaHZkYmJrYmNlbGlzdWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTE4MjYsImV4cCI6MjA2NzkyNzgyNn0.unXOuVkZ5zh4zizLe3wquHiDOBaPxKvbRduVUt5gcIE'
        },
        body: JSON.stringify({
          planId: planId,
          isSignup: false
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data?.authorization_url) {
        // Try to open in new tab first
        const newTab = window.open(data.authorization_url, '_blank', 'noopener,noreferrer');
        
        // Check if popup was blocked
        if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
          // Popup was blocked, redirect in current tab instead
          toast({
            title: "Redirecting to Payment",
            description: "Redirecting to payment page...",
            duration: 2000
          });
          
          setTimeout(() => {
            window.location.href = data.authorization_url;
          }, 1000);
        } else {
          // Popup opened successfully
          toast({
            title: "Payment Window Opened",
            description: "Complete your payment in the new tab to upgrade your plan"
          });
        }
      } else {
        throw new Error('No authorization URL received from payment processor');
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate upgrade",
        variant: "destructive"
      });
    } finally {
      setUpgrading(null);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      console.log("Verifying payment with reference:", reference);
      
      // Use the edge function which has access to the secure Paystack secret key
      const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: { reference }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.success) {
        console.log("Payment verification successful:", data);
        toast({
          title: "Payment Verified!",
          description: "Your subscription has been activated successfully"
        });
        fetchCurrentSubscription();
        fetchPaymentHistory();
      } else {
        console.error("Payment verification failed:", data);
        throw new Error(data?.error || "Payment verification failed");
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive"
      });
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div key={`billing-${currencyCode}-${updateCounter}`} className="space-y-6">{/* Add key to force re-render */}
      {currentSubscription ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-800">Active Subscription</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  {currentSubscription.status?.toUpperCase()}
                </Badge>
                {customPricing && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    Custom Pricing
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="text-green-700">
              You're currently subscribed to the {currentSubscription.billing_plans?.name} plan
              {customPricing && ' with custom pricing applied'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Current Amount */}
              <div className="flex items-center space-x-2">
                <CurrencyIcon currency={currencyCode} className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Amount</p>
                  <p className="text-lg font-bold text-green-600">
                    {customPricing ? 
                      formatPrice(customPricing.custom_amount) :
                      (currentSubscription.billing_plans?.price ? 
                        formatPrice(currentSubscription.billing_plans.price) : 'N/A')
                    }
                  </p>
                  {customPricing && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground line-through">
                        Original: {formatPrice(customPricing.original_amount)}
                      </p>
                      {customPricing.discount_percentage && (
                        <Badge variant="outline" className="text-green-600 text-xs">
                          {customPricing.discount_percentage}% off
                        </Badge>
                      )}
                    </div>
                  )}
                  {currentSubscription.is_prorated_period && (
                    <p className="text-xs text-orange-600">
                      Prorated for this billing cycle
                    </p>
                  )}
                </div>
              </div>

              {/* Next Billing */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Next Billing</p>
                  <p className="text-sm text-green-600">
                    {currentSubscription.next_billing_date ? formatDate(currentSubscription.next_billing_date) : 
                     currentSubscription.expires_at ? formatDate(currentSubscription.expires_at) : 'Not set'}
                  </p>
                  <p className="text-xs text-blue-600">
                    Bills on 1st of each month
                  </p>
                </div>
              </div>

              {/* Reference */}
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Reference</p>
                  <p className="text-sm text-green-600 font-mono">
                    {currentSubscription.reference || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col items-end space-y-2">
                {(() => {
                  // Check if user is on trial
                  const trialEnd = currentSubscription.trial_end ? new Date(currentSubscription.trial_end) : null;
                  const now = new Date();
                  const isOnTrial = trialEnd && now < trialEnd;
                  const daysLeftInTrial = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  const isTrialEnding = isOnTrial && daysLeftInTrial <= 7;
                  
                  // Check subscription expiry
                  const expiryDate = currentSubscription.expires_at ? new Date(currentSubscription.expires_at) : 
                                   currentSubscription.current_period_end ? new Date(currentSubscription.current_period_end) : null;
                  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  const isExpired = expiryDate && daysLeft <= 0;
                  const isPending = currentSubscription.status === 'pending';
                  
                  if (isOnTrial || isPending) {
                    return (
                      <>
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white w-full"
                          onClick={() => handleUpgrade(currentSubscription.billing_plan_id)}
                          disabled={upgrading === currentSubscription.billing_plan_id}
                        >
                          {upgrading === currentSubscription.billing_plan_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                              <>
                               Pay {customPricing ? 
                                 formatPrice(customPricing.custom_amount) :
                                 (currentSubscription.billing_plans?.price ? 
                                   formatPrice(currentSubscription.billing_plans.price) : 
                                   'Current Plan')
                               }
                                <ExternalLink className="h-4 w-4 ml-2" />
                              </>
                           )}
                        </Button>
                        {isOnTrial && (
                          <p className="text-xs text-orange-600 text-center">
                            {isTrialEnding ? 
                              `Trial ends in ${daysLeftInTrial} day${daysLeftInTrial !== 1 ? 's' : ''}` :
                              `${daysLeftInTrial} days left in trial`
                            }
                          </p>
                        )}
                        {isPending && (
                          <p className="text-xs text-blue-600 text-center">
                            Subscription pending payment
                          </p>
                        )}
                      </>
                    );
                  }
                  
                  if (isExpired) {
                    return (
                      <>
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white w-full"
                          onClick={() => handleUpgrade(currentSubscription.billing_plan_id)}
                          disabled={upgrading === currentSubscription.billing_plan_id}
                        >
                          {upgrading === currentSubscription.billing_plan_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Renew Plan
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-red-600 text-center">
                          Subscription expired - Renew to continue
                        </p>
                      </>
                    );
                  }
                  
                  return (
                    <Button 
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-100"
                      onClick={() => {
                        const upgradePlan = convertedPlans.find(plan => plan.price > (currentSubscription.billing_plans?.price || 0));
                        if (upgradePlan) {
                          handleUpgrade(upgradePlan.id);
                        }
                      }}
                      disabled={upgrading !== null || !convertedPlans.some(plan => plan.price > (currentSubscription.billing_plans?.price || 0))}
                    >
                      {upgrading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Upgrade Plan
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            </div>

            {/* Billing Details Section */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Plan Rate */}
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Current Plan Rate</h4>
                  {customPricing ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          {formatPrice(customPricing.custom_amount)}
                        </span>
                        <span className="text-sm text-muted-foreground">/ {currentSubscription.billing_plans?.period}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Reason: {customPricing.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Effective: {formatDate(customPricing.effective_date)}
                        {customPricing.expires_at && ` - ${formatDate(customPricing.expires_at)}`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          {formatPrice(currentSubscription.billing_plans?.price || 0)}
                        </span>
                        <span className="text-sm text-muted-foreground">/ {currentSubscription.billing_plans?.period}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Standard pricing</p>
                    </div>
                  )}
                </div>

                {/* Setup Fee */}
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Setup Fee</h4>
                  <div className="space-y-1">
                    <span className="text-2xl font-bold text-green-600">
                      {customPricing?.setup_fee ? formatPrice(customPricing.setup_fee) : formatPrice(0)}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {customPricing?.setup_fee ? 'One-time fee' : 'No setup fee'}
                    </p>
                  </div>
                </div>

                {/* Next Billing Amount */}
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Next Billing Amount</h4>
                  <div className="space-y-1">
                    <span className="text-2xl font-bold text-orange-600">
                      {(() => {
                        const recurringAmount = customPricing ? customPricing.custom_amount : (currentSubscription.billing_plans?.price || 0);
                        const setupFee = customPricing?.setup_fee || 0;
                        const totalAmount = recurringAmount + setupFee;
                        return formatPrice(totalAmount);
                      })()}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Due: {currentSubscription.next_billing_date ? 
                          formatDate(currentSubscription.next_billing_date) : 
                          'Next billing cycle'
                        }
                      </p>
                      {customPricing?.setup_fee && (
                        <p className="text-xs">
                          Includes setup fee: {formatPrice(customPricing.setup_fee)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have an active subscription. Choose a plan below to get started.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h3 className="text-xl font-semibold mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {convertedPlans.map((plan) => {
            const isCurrentPlan = currentSubscription?.billing_plans?.name === plan.name;
            const isPopular = plan.popularity > 0;
            const currentPlanPrice = currentSubscription?.billing_plans?.price || 0;
            const isUpgrade = plan.price > currentPlanPrice;
            const isDowngrade = plan.price < currentPlanPrice && currentSubscription;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-200 hover:shadow-lg ${
                  isCurrentPlan ? 'ring-2 ring-green-500 bg-green-50' : ''
                } ${isPopular ? 'border-primary' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      {plan.badge || 'Popular'}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="space-y-1">
                     <div className="text-3xl font-bold">
                       {formatPrice(plan.price)}
                     </div>
                    <div className="text-sm text-muted-foreground">
                      per {plan.period}
                    </div>
                     {plan.original_price && plan.original_price > plan.price && (
                       <div className="text-sm text-muted-foreground line-through">
                         {formatPrice(plan.original_price)}
                       </div>
                     )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features?.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan ? "outline" : isUpgrade ? "default" : "secondary"}
                    disabled={isCurrentPlan || upgrading === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {upgrading === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      <>
                        {isUpgrade ? (
                          <>Upgrade to {plan.name}</>
                        ) : isDowngrade ? (
                          <>Downgrade to {plan.name}</>
                        ) : (
                          <>Switch to {plan.name}</>
                        )}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  {isCurrentPlan && (
                    <div className="text-center">
                       <p className="text-xs text-muted-foreground">
                         {currentSubscription?.next_billing_date && (
                           <>Next billing: {formatDate(currentSubscription.next_billing_date)}</>
                         )}
                       </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Payment Verification</span>
          </CardTitle>
          <CardDescription>
            If you've completed a payment but don't see your subscription updated, you can verify it manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Enter payment reference"
                className="flex-1 px-3 py-2 border rounded-md"
                id="paymentReference"
              />
              <Button 
                onClick={() => {
                  const input = document.getElementById('paymentReference') as HTMLInputElement;
                  if (input?.value) {
                    verifyPayment(input.value);
                    input.value = '';
                  }
                }}
              >
                Verify Payment
              </Button>
            </div>
            
            {/* Quick verify for the provided reference */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                <strong>Found your payment reference:</strong> TGO9E045DN
              </p>
              <Button 
                onClick={() => verifyPayment('TGO9E045DN')}
                variant="outline"
                className="w-full"
              >
                Verify Payment TGO9E045DN
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment History</span>
          </CardTitle>
          <CardDescription>
            View your recent payment transactions and billing history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      payment.payment_status === 'completed' ? 'bg-green-100' :
                      payment.payment_status === 'failed' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      {payment.payment_status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : payment.payment_status === 'failed' ? (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.billing_plans?.name || 'Subscription Payment'}
                        {payment.is_prorated && (
                          <span className="ml-2 text-orange-600 text-xs">(Prorated)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.payment_type} • {formatDate(payment.created_at)}
                      </p>
                      {payment.proration_start_date && payment.proration_end_date && (
                        <p className="text-xs text-muted-foreground">
                          Period: {formatDate(payment.proration_start_date)} - {formatDate(payment.proration_end_date)}
                        </p>
                      )}
                      {payment.billing_period_start && payment.billing_period_end && !payment.proration_start_date && (
                        <p className="text-xs text-muted-foreground">
                          Billing period: {formatDate(payment.billing_period_start)} - {formatDate(payment.billing_period_end)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="font-semibold">
                       {formatPrice(payment.amount)}
                     </p>
                     {payment.is_prorated && payment.full_period_amount && (
                       <p className="text-xs text-muted-foreground line-through">
                         Full: {formatPrice(payment.full_period_amount)}
                       </p>
                     )}
                    <Badge 
                      variant={
                        payment.payment_status === 'completed' ? 'default' :
                        payment.payment_status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {payment.payment_status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ref: {payment.payment_reference.slice(-8)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No payment history available</p>
              <p className="text-sm">Your payment transactions will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
