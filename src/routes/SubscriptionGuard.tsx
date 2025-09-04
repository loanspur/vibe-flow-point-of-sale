import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard } from 'lucide-react';
import { isAuthPath } from '@/lib/route-helpers';
import { log } from '@/lib/logger';

interface SubscriptionData {
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  billing_plans: { name: string; price: number; period: string } | null;
}

export function SubscriptionGuard() {
  const { user, tenantId, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();

  // Hard bypass on /auth
  if (typeof window !== 'undefined' && isAuthPath(window.location.pathname)) {
    return <Outlet />;
  }

  useEffect(() => {
    if (!user || !tenantId || authLoading) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_subscription_details')
          .select(`
            status,
            trial_end,
            current_period_end,
            billing_plans ( name, price, period )
          `)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (error) {
          log.error('Error fetching subscription:', error);
          setHasAccess(true);
          setLoading(false);
          return;
        }

        setSubscription(data);
        if (!data) setHasAccess(true);
        else if (data.status === 'active') setHasAccess(true);
        else if (data.status === 'trial' || data.status === 'trialing') {
          if (data.trial_end) setHasAccess(new Date(data.trial_end) > new Date());
          else setHasAccess(true);
        } else if (data.status === 'pending') setHasAccess(true);
        else setHasAccess(data.status !== 'cancelled' && data.status !== 'expired');
      } catch (err) {
        log.error('Error checking subscription:', err);
        setHasAccess(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, tenantId, authLoading]);

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-paystack-checkout', {
        body: { planId: subscription?.billing_plans ? 'existing-plan' : 'basic-plan', email: user?.email }
      });
      if (error) return log.error('Error creating checkout:', error);
      if (data?.authorization_url) window.location.href = data.authorization_url;
    } catch (err) {
      log.error('Error upgrading subscription:', err);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(price);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Subscription Required</CardTitle>
            <CardDescription>
              {subscription?.status === 'pending'
                ? 'Your payment is pending. Please complete your payment to continue.'
                : subscription?.trial_end && new Date(subscription.trial_end) < new Date()
                ? 'Your trial has expired. Upgrade to continue using the system.'
                : 'An active subscription is required to access this system.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription?.billing_plans && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{subscription.billing_plans.name} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(subscription.billing_plans.price)} per {subscription.billing_plans.period}
                    </p>
                  </div>
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={handleUpgrade} className="w-full" size="lg">
                <CreditCard className="mr-2 h-4 w-4" />
                {subscription?.status === 'pending' ? 'Complete Payment' : 'Upgrade Now'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}
