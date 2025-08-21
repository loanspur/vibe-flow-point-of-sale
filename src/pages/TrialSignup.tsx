import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Building2, Users, Zap, ArrowLeft, Shield, Clock, CreditCard, Star, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

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
  const { user, refreshUserInfo } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || '');
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Account creation, 2: Payment setup
  const { toast } = useToast();

  // Check if this is Google SSO flow
  const isGoogleFlow = searchParams.get('google') === 'true';

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
    return `${price.toLocaleString()}`;
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
    // Handle different scenarios based on user state
    if (user) {
      setStep(2); // Show trial activation
    } else if (isGoogleFlow) {
      setStep(1); // Show account creation with Google option
    }
  }, [user, isGoogleFlow]);

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
      console.log('Starting trial signup process with business data...');
      
      // Create account with business data in metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName,
            business_name: formData.businessName
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        throw authError;
      }

      if (authData.user) {
        console.log('User account created successfully:', authData.user.id);
        
        // Immediately create tenant and send welcome email
        console.log('Creating tenant with business data...');
        const { data: tenantData, error: tenantError } = await supabase.functions.invoke('create-tenant-trial', {
          body: {
            userId: authData.user.id,
            businessData: {
              businessName: formData.businessName,
              ownerName: formData.ownerName,
              ownerEmail: formData.email,
              businessEmail: formData.email
            },
            planType: selectedPlan,
            isGoogleUser: false
          }
        });

        if (tenantError) {
          console.error('Tenant creation error:', tenantError);
          throw new Error('Failed to set up your business account');
        }

        console.log('Tenant created successfully:', tenantData);
        
        toast({
          title: "Success! 🎉",
          description: "Your business account has been created! Check your email for login credentials and instructions.",
          variant: "default"
        });
        
        // Move to success step
        setStep(2);
      }

    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.message && error.message.includes('already registered')) {
        errorMessage = "An account with this email already exists. Please try signing in instead.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  // Remove this redundant function since we now handle everything in handleCreateAccount

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
              Secure payments
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
                <CardContent className="space-y-6">
                  {/* Google Sign In Option - Hidden for now */}
                  {/* <div className="space-y-4">
                    <GoogleSignInButton 
                      buttonText="Continue with Google"
                      onSuccess={(user) => {
                        console.log('Google sign-in successful:', user);
                        // OAuth flow will handle redirection
                      }}
                      onError={(error) => {
                        console.error('Google sign-in error:', error);
                      }}
                    />
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with email
                        </span>
                      </div>
                    </div>
                  </div> */}

                  {/* Traditional Email/Password Form */}
                  <div className="space-y-4">
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
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <div className="mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-green-800 mb-4">
                  🎉 Welcome to VibePOS!
                </h3>
                
                <div className="space-y-4 text-green-700">
                  <p className="text-lg font-medium">
                    Your business account has been successfully created!
                  </p>
                  
                  <div className="bg-white/60 rounded-lg p-4 border border-green-200">
                    <p className="font-semibold text-green-800 mb-2">📧 Check Your Email</p>
                    <p className="text-sm">
                      We've sent you an email with:
                    </p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Your login credentials</li>
                      <li>• Temporary password</li>
                      <li>• Your unique subdomain link</li>
                      <li>• Quick start guide</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-semibold text-blue-800 mb-2">🔐 Important Security Note</p>
                    <p className="text-sm text-blue-700">
                      You'll be required to change your temporary password when you first log in to keep your business data secure.
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={() => navigate('/')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      Return to Homepage
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}