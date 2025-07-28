import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Building2, Mail, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: any;
  badge?: string;
  badge_color?: string;
}

interface TrialSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: BillingPlan | null;
  getDisplayPrice: (plan: BillingPlan) => string;
  getDisplayPeriod: () => string;
  formatFeatures: (features: any) => any[];
}

export const TrialSignupModal: React.FC<TrialSignupModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  getDisplayPrice,
  getDisplayPeriod,
  formatFeatures
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    businessName: '',
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

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your full name",
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

    if (!formData.businessName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your business name",
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
    
    if (!validateForm() || !selectedPlan) return;
    
    setLoading(true);

    try {
      // Create user directly with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            business_name: formData.businessName,
            plan_id: selectedPlan.id
          }
        }
      });

      if (authError) throw authError;

      // Signup successful - user can now log in
      if (authData.user) {
        console.log('User account created successfully:', authData.user.id);
      }

      toast({
        title: "Account Created Successfully!",
        description: "Welcome to VibePOS! Your business has been set up successfully. Redirecting to your dashboard...",
        variant: "default"
      });

      onClose();
      
      // Redirect to admin dashboard after a short delay
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (error: any) {
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.message?.includes('already registered')) {
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

  if (!selectedPlan) return null;

  const features = formatFeatures(selectedPlan.features);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start Your Free Trial</DialogTitle>
          <DialogDescription>
            Create your account and start using VibePOS today. No credit card required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Selected Plan Summary */}
          <div className="order-2 md:order-1">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedPlan.name} Plan</CardTitle>
                  {selectedPlan.badge && (
                    <Badge className={selectedPlan.badge_color || 'bg-primary'}>
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {selectedPlan.badge}
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {getDisplayPrice(selectedPlan)}
                  <span className="text-sm text-muted-foreground font-normal">
                    {getDisplayPeriod()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium text-sm">14-day free trial included</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Full access to all features. No credit card required.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Plan includes:</h4>
                  <ul className="space-y-1">
                    {features.slice(0, 4).map((feature: any, index: number) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>{typeof feature === 'string' ? feature : feature?.name || feature?.feature || 'Feature'}</span>
                      </li>
                    ))}
                    {features.length > 4 && (
                      <li className="text-xs text-muted-foreground">
                        +{features.length - 4} more features
                      </li>
                    )}
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
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter a secure password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
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