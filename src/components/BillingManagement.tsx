import { useUnifiedBilling } from '@/hooks/useUnifiedBilling';
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
  ExternalLink,
  DollarSign
} from 'lucide-react';

// Interfaces now imported from unified billing service

export default function BillingManagement() {
  const { formatPrice, currencyCode, updateCounter } = useCurrencyUpdate();
  
  // Use unified billing hook instead of local state
  const {
    subscription: currentSubscription,
    paymentHistory,
    billingPlans,
    effectivePricing,
    loading,
    upgrading,
    handleUpgrade,
    verifyPayment,
    subscriptionAccess,
    syncSubscriptionStatus
  } = useUnifiedBilling();
  
  // Keep converted plans for compatibility
  const convertedPlans = billingPlans;

  // All data fetching is now handled by useUnifiedBilling hook


  // handleUpgrade and verifyPayment are now provided by useUnifiedBilling hook


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
                  {subscriptionAccess.isTrialActive ? 'TRIAL' : currentSubscription.status?.toUpperCase()}
                </Badge>
                {effectivePricing?.is_custom && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    Custom Pricing
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="text-green-700">
              You're currently subscribed to the {currentSubscription.billing_plans?.name} plan
              {effectivePricing?.is_custom && ' with custom pricing applied'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Current Plan Rate */}
              <div className="flex items-center space-x-2">
                <CurrencyIcon currency={currencyCode} className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Current Plan Rate</p>
                  <p className="text-lg font-bold text-green-600">
                    {effectivePricing ? 
                      formatPrice(effectivePricing.effective_amount) :
                      (currentSubscription.billing_plans?.price ? 
                        formatPrice(currentSubscription.billing_plans.price) : 'N/A')
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    per {currentSubscription.billing_plans?.period}
                  </p>
                  {effectivePricing?.is_custom && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground line-through">
                        Original: {formatPrice(effectivePricing.original_amount)}
                      </p>
                      {effectivePricing.discount_percentage && (
                        <Badge variant="outline" className="text-green-600 text-xs">
                          {effectivePricing.discount_percentage}% off
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

              {/* Setup Fee */}
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Setup Fee</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatPrice(effectivePricing?.setup_fee || currentSubscription.setup_fee || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(effectivePricing?.setup_fee || currentSubscription.setup_fee) ? 'One-time fee' : 'No setup fee'}
                  </p>
                </div>
              </div>

              {/* Next Billing Amount */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Next Billing</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatPrice((effectivePricing?.effective_amount || currentSubscription.billing_plans?.price || 0) + (effectivePricing?.setup_fee || currentSubscription.setup_fee || 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due: {currentSubscription.next_billing_date ? 
                      formatDate(currentSubscription.next_billing_date) : 
                      'Next billing cycle'
                    }
                  </p>
                  <p className="text-xs text-blue-600">
                    Setup fee + recurring charge
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end mb-6">
              {(() => {
                // Use unified billing access info
                const { isTrialActive, isSubscriptionActive, daysLeftInTrial, daysUntilExpiry } = subscriptionAccess;
                const isTrialEnding = isTrialActive && daysLeftInTrial && daysLeftInTrial <= 7;
                const isPending = currentSubscription.status === 'pending' && !isTrialActive;
                
                if (isTrialActive) {
                  return (
                    <div className="flex flex-col items-end space-y-2">
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
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
                              Pay {effectivePricing ? 
                                formatPrice(effectivePricing.effective_amount) :
                                (currentSubscription.billing_plans?.price ? 
                                  formatPrice(currentSubscription.billing_plans.price) : 
                                  'Current Plan')
                              }
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </>
                         )}
                      </Button>
                        <p className="text-xs text-blue-600 text-center">
                          {isTrialEnding ? 
                            `Trial ends in ${daysLeftInTrial || 0} day${(daysLeftInTrial || 0) !== 1 ? 's' : ''}` :
                            `${daysLeftInTrial || 0} days left in trial`
                          }
                        </p>
                    </div>
                   );
                 }
                 
                 if (isPending) {
                   return (
                     <div className="flex flex-col items-end space-y-2">
                       <Button 
                         className="bg-yellow-600 hover:bg-yellow-700 text-white"
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
                               Pay {effectivePricing ? 
                                 formatPrice(effectivePricing.effective_amount) :
                                 (currentSubscription.billing_plans?.price ? 
                                   formatPrice(currentSubscription.billing_plans.price) : 
                                   'Current Plan')
                               }
                               <ExternalLink className="h-4 w-4 ml-2" />
                             </>
                          )}
                       </Button>
                       <p className="text-xs text-yellow-600 text-center">
                         Subscription pending payment
                       </p>
                     </div>
                   );
                 }
                 
                 if (!isSubscriptionActive && currentSubscription.status !== 'pending') {
                  return (
                    <div className="flex flex-col items-end space-y-2">
                      <Button 
                        className="bg-red-600 hover:bg-red-700 text-white"
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
                    </div>
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
