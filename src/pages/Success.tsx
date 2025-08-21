import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Calendar, CreditCard, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Success() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (error) throw error;
        setSubscriptionData(data);
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check subscription after processing
    const timer = setTimeout(checkSubscription, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-green-600">
                  <Zap className="w-3 h-3 mr-1" />
                  Trial Started
                </Badge>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Welcome to VibePOS! 🎉
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your 14-day free trial has started successfully. You now have full access to all features.
            </p>
          </div>

          {/* Subscription Details */}
          {subscriptionData && (
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Your Trial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <Badge variant="outline" className="capitalize">
                      {subscriptionData.subscription_tier || 'Premium'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className="bg-green-600">
                      {subscriptionData.is_trial ? 'Free Trial' : 'Active'}
                    </Badge>
                  </div>
                  
                  {subscriptionData.trial_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Trial Ends:</span>
                      <span className="font-medium">
                        {new Date(subscriptionData.trial_end).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Billing:</span>
                    <span className="font-medium">No charge until trial ends</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
              <CardDescription>
                Get the most out of your VibePOS trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Set Up Your Team</h4>
                      <p className="text-sm text-muted-foreground">
                        Add team members and configure roles
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Configure POS</h4>
                      <p className="text-sm text-muted-foreground">
                        Set up products, categories, and pricing
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Explore Features</h4>
                      <p className="text-sm text-muted-foreground">
                        Try all premium features during your trial
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Get Support</h4>
                      <p className="text-sm text-muted-foreground">
                        Access our help center and support team
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" asChild>
              <Link to="/tenants">
                Manage Account
              </Link>
            </Button>
          </div>

          {/* Trial Reminder */}
          <div className="bg-muted/50 p-6 rounded-lg max-w-2xl mx-auto">
            <h3 className="font-medium mb-2">Trial Reminder</h3>
            <p className="text-sm text-muted-foreground">
              You have 14 days to explore all features. If you decide VibePOS isn't right for you, 
              simply cancel before your trial ends and you won't be charged anything.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}