import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Building2, Mail, User, Phone, Globe, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface TenantCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const countries = [
  'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan',
  'Ethiopia', 'Somalia', 'Nigeria', 'Ghana', 'South Africa', 'Egypt',
  'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan', 'Other'
];

export const TenantCreationModal: React.FC<TenantCreationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    mobileNumber: '',
    country: '',
    password: '',
    confirmPassword: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCountryChange = (value: string) => {
    setFormData({
      ...formData,
      country: value
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your full name",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.businessName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your business name",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.mobileNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter your mobile number",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.country) {
      toast({
        title: "Error",
        description: "Please select your country",
        variant: "destructive"
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-tenant-trial', {
        body: {
          fullName: formData.fullName,
          businessName: formData.businessName,
          email: formData.email,
          mobileNumber: formData.mobileNumber,
          country: formData.country,
          password: formData.password
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Account Created Successfully!",
        description: `Welcome to VibePOS! Your business "${formData.businessName}" has been set up with a 14-day Enterprise trial. You can now sign in.`,
        variant: "default"
      });

      onClose();
      
      // Redirect to login page
      setTimeout(() => {
        navigate('/auth');
      }, 2000);

    } catch (error: any) {
      console.error('Tenant creation error:', error);
      
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start Your 14-Day Enterprise Trial</DialogTitle>
          <DialogDescription>
            Create your VibePOS account and get immediate access to all Enterprise features. No credit card required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Enterprise Plan Summary */}
          <div className="order-2 md:order-1">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Enterprise Plan</CardTitle>
                  <Badge className="bg-primary">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Premium
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-primary">
                  KES 19,900
                  <span className="text-sm text-muted-foreground font-normal">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">For large businesses requiring advanced features</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium text-sm">14-day free trial included</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Full access to all Enterprise features. No credit card required.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Enterprise includes:</h4>
                  <ul className="space-y-1">
                    {[
                      'Unlimited Locations & Users',
                      'Unlimited Products',
                      'White-label Solutions',
                      'Custom Integrations',
                      '24/7 Phone Support',
                      'Dedicated Account Manager'
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Signup Form */}
          <div className="order-1 md:order-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessName"
                    name="businessName"
                    type="text"
                    placeholder="Your Business Name"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@business.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobileNumber"
                    name="mobileNumber"
                    type="tel"
                    placeholder="+254 700 000 000"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Select value={formData.country} onValueChange={handleCountryChange} required>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Start Free Trial
                    <Zap className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By signing up, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};