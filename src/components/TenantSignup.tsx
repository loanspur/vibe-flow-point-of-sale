import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Building2, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$29',
    period: '/month',
    description: 'Perfect for small businesses just getting started',
    maxUsers: 5,
    features: [
      'Up to 5 users',
      'Basic POS functionality',
      'Sales reporting',
      'Customer management',
      'Email support'
    ],
    popular: false
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$79',
    period: '/month',
    description: 'Ideal for growing businesses with advanced needs',
    maxUsers: 25,
    features: [
      'Up to 25 users',
      'Advanced POS features',
      'Advanced analytics',
      'Inventory management',
      'Multi-location support',
      'Priority support'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'For large businesses with complex requirements',
    maxUsers: 100,
    features: [
      'Up to 100 users',
      'All premium features',
      'Custom integrations',
      'Advanced reporting',
      'Dedicated account manager',
      '24/7 phone support'
    ],
    popular: false
  }
];

export default function TenantSignup() {
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    subdomain: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    password: ''
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    if (!formData.businessName || !formData.contactEmail || !formData.ownerEmail || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create the user account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.ownerEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName
          }
        }
      });

      if (authError) throw authError;

      // Create the tenant
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.businessName,
          subdomain: formData.subdomain,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          address: formData.address,
          plan_type: selectedPlan,
          max_users: selectedPlanData?.maxUsers || 10
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      toast({
        title: "Success!",
        description: "Your account has been created. Please check your email to verify your account."
      });

      // Reset form
      setFormData({
        businessName: '',
        subdomain: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        ownerName: '',
        ownerEmail: '',
        password: ''
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Get started with VibePOS and transform your business
        </p>
      </div>

      {/* Plan Selection */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative cursor-pointer transition-all ${
              selectedPlan === plan.id 
                ? 'ring-2 ring-primary scale-105' 
                : 'hover:shadow-lg'
            } ${plan.popular ? 'border-primary' : ''}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {plan.price}<span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Up to {plan.maxUsers} users
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signup Form */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Complete Your Signup
          </CardTitle>
          <CardDescription>
            Fill in your business details to get started with the {plans.find(p => p.id === selectedPlan)?.name} plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
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
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex">
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => handleInputChange('subdomain', e.target.value)}
                  placeholder="yourbusiness"
                />
                <span className="flex items-center px-3 text-sm text-muted-foreground border border-l-0 rounded-r-md bg-muted">
                  .vibepos.com
                </span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Business Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="business@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone Number</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Business Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          <hr className="my-6" />
          
          <h3 className="text-lg font-semibold">Account Owner Details</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Full Name</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
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

          <Button 
            onClick={handleSignup} 
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
                <Zap className="h-4 w-4 mr-2" />
                Start Your {plans.find(p => p.id === selectedPlan)?.name} Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}