import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Building2, Users, Zap, ArrowLeft, Shield, Clock, CreditCard, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: any;
  badge?: string;
  badge_color?: string;
  customers: number;
  pricing?: any;
}

export default function TrialSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || '');
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Account creation, 2: Payment setup
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setPlans(data);
        // Set default plan if none selected
        if (!selectedPlan) {
          setSelectedPlan(data[0].id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load billing plans: " + error.message,
        variant: "destructive"
      });
    } finally {
      setPlansLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `KES ${price.toLocaleString()}`;
  };

  const formatFeatures = (features: any) => {
    if (Array.isArray(features)) {
      return features;
    }
    if (typeof features === 'object' && features !== null) {
      return Object.values(features).flat();
    }
    return [];
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    // If user is already authenticated, go to step 2
    if (user) {
      setStep(2);
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateAccount = async () => {
    if (!formData.businessName || !formData.ownerName || !formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process...');
      
      // Step 1: Create user account
      const { error: signUpError } = await signUp(formData.email, formData.password, formData.ownerName);

      if (signUpError) {
        console.error('Signup error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }
        throw signUpError;
      }

      console.log('Signup successful, checking authentication...');

      // Check current session immediately
      const { data: session } = await supabase.auth.getSession();
      console.log('Current session:', session);

      if (session.session?.user) {
        console.log('User authenticated immediately');
        // User is authenticated, proceed with tenant creation
        await createTenant();
      } else {
        console.log('Waiting for authentication...');
        // Wait for authentication with better retry logic
        let retries = 0;
        const maxRetries = 8; // 4 seconds total
        let authenticated = false;
        
        while (retries < maxRetries && !authenticated) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check both the auth context user and session
          const { data: currentSession } = await supabase.auth.getSession();
          authenticated = !!(currentSession.session?.user || user);
          
          retries++;
          console.log(`Retry ${retries}/${maxRetries}, authenticated:`, authenticated);
        }

        if (authenticated) {
          console.log('Authentication successful after retries');
          await createTenant();
        } else {
          console.log('Authentication timeout, proceeding without tenant setup');
          // Show user they can complete setup later
          toast({
            title: "Account Created Successfully!",
            description: "Please check your email to verify your account, then you can complete the business setup.",
            variant: "default"
          });
          setStep(2);
        }
      }

    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Error",
        description: error.message.includes('Invalid login credentials') 
          ? "Please check your email and password and try again."
          : error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async () => {
    try {
      console.log('Creating tenant...');
      console.log('Form data:', {
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        email: formData.email
      });
      
      const { data: tenantData, error: tenantError } = await supabase.functions.invoke('create-tenant', {
        body: {
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          email: formData.email,
        }
      });

      console.log('Tenant creation response:', { tenantData, tenantError });

      if (tenantError) {
        console.error('Tenant creation error:', tenantError);
        throw new Error(`Failed to set up business: ${tenantError.message}`);
      }

      if (!tenantData?.success) {
        console.error('Tenant creation failed:', tenantData);
        throw new Error(tenantData?.error || 'Failed to create business account');
      }

      console.log('Tenant created successfully:', tenantData);
      setStep(2);
      toast({
        title: "Business account created!",
        description: `Welcome to VibePOS, ${formData.businessName}! Now let's set up your subscription.`
      });

    } catch (tenantError: any) {
      console.error('Tenant setup error:', tenantError);
      
      // Allow user to proceed to payment even if tenant setup fails
      toast({
        title: "Account created - Setup incomplete",
        description: "Your account was created but business setup needs to be completed in your dashboard.",
        variant: "destructive"
      });
      
      setStep(2);
    }
  };

  const handleStartTrial = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please create your account first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Start trial without payment
      const { data, error } = await supabase.functions.invoke('start-free-trial', {
        body: { planId: selectedPlan }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Trial Started!",
          description: "Your 14-day free trial has begun. Welcome to VibePOS!",
          variant: "default"
        });
        
        // Redirect to admin dashboard after successful trial start
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start trial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <Badge variant="outline" className="text-sm px-4 py-2">
            <Zap className="h-4 w-4 mr-2" />
            14-Day Free Trial
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold">
            Start Your Free Trial
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started with VibePOS today. No credit card required for your 14-day trial.
          </p>
          
          <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2 text-green-500" />
              No credit card required
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              14-day free trial
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-purple-500" />
              Cancel anytime
            </div>
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-orange-500" />
              Paystack or M-Pesa
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Choose Your Plan</h2>
              {plansLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading plans...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan) => {
                    const features = formatFeatures(plan.features);
                    const isPopular = plan.badge?.toLowerCase().includes('popular') || plan.name === 'Professional';
                    
                    return (
                      <Card 
                        key={plan.id}
                        className={`cursor-pointer transition-all ${
                          selectedPlan === plan.id 
                            ? 'ring-2 ring-primary border-primary' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-xl">{plan.name}</CardTitle>
                              {plan.badge && (
                                <Badge className={plan.badge_color || 'bg-primary'}>
                                  <Star className="h-3 w-3 mr-1 fill-current" />
                                  {plan.badge}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                {formatPrice(plan.price)}
                                <span className="text-sm text-muted-foreground font-normal">
                                  /{plan.period}
                                </span>
                              </div>
                              <div className="text-sm text-green-600">
                                Free for 14 days
                              </div>
                            </div>
                          </div>
                          <CardDescription>{plan.description}</CardDescription>
                          {plan.customers > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {plan.customers} businesses using this plan
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {features.slice(0, 3).map((feature: any, index: number) => (
                              <li key={index} className="flex items-center space-x-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                <span>{typeof feature === 'string' ? feature : feature?.name || feature?.feature || 'Feature'}</span>
                              </li>
                            ))}
                            {features.length > 3 && (
                              <li className="text-sm text-muted-foreground">
                                +{features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sign Up Form */}
          <div className="space-y-6">
            {step === 1 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Create Your Account
                  </CardTitle>
                  <CardDescription>
                    Step 1 of 2: Set up your business account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      placeholder="Your Business Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Your Full Name *</Label>
                    <Input
                      id="ownerName"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Choose a strong password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCreateAccount} 
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Start Your Free Trial
                  </CardTitle>
                  <CardDescription>
                    Step 2 of 2: Start your free trial for {selectedPlanData?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{selectedPlanData?.name}</span>
                      <span className="font-bold">{selectedPlanData ? formatPrice(selectedPlanData.price) : 'Loading...'}/${selectedPlanData?.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedPlanData?.description}
                    </p>
                    <div className="text-sm">
                      <div className="flex items-center justify-between">
                        <span>Trial Period:</span>
                        <span className="text-green-600 font-medium">14 days free</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Then:</span>
                        <span>{selectedPlanData ? formatPrice(selectedPlanData.price) : 'Loading...'}/${selectedPlanData?.period}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">What's included:</h4>
                    <ul className="space-y-2">
                      {selectedPlanData && formatFeatures(selectedPlanData.features).map((feature: any, index: number) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{typeof feature === 'string' ? feature : feature?.name || feature?.feature || 'Feature'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={handleStartTrial} 
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting Trial...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Start Free Trial
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    No credit card required. Start your 14-day free trial instantly. 
                    You'll be prompted to add payment details when your trial expires.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}