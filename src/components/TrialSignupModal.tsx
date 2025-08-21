import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Mail, User, Loader2, Phone, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { countriesData, CountryData, getCountryByName } from '@/lib/countries-data';
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
    mobileNumber: '',
    country: '',
    currency: '',
    timezone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [selectedCountryData, setSelectedCountryData] = useState<CountryData | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCountryChange = (countryName: string) => {
    const countryData = getCountryByName(countryName);
    setSelectedCountryData(countryData || null);
    
    setFormData({
      ...formData,
      country: countryName,
      currency: countryData?.currency || '',
      timezone: countryData?.timezone || ''
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

    if (!formData.acceptTerms) {
      toast({
        title: "Error",
        description: "Please accept the Terms of Service and Privacy Policy",
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
            mobile_number: formData.mobileNumber,
            country: formData.country,
            currency: formData.currency,
            timezone: formData.timezone,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start Your Free Trial</DialogTitle>
          <DialogDescription>
            Create your account and start using VibePOS today. No credit card required.
          </DialogDescription>
        </DialogHeader>

        {/* Google Sign In Option - Hidden for now */}
        {/* <div className="space-y-4">
          <GoogleSignInButton 
            buttonText="Continue with Google"
            onSuccess={(user) => {
              console.log('Google sign-in successful:', user);
              // OAuth flow will handle redirection to OTP verification
            }}
            onError={(error) => {
              console.error('Google sign-in error:', error);
            }}
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </div> */}

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
            <Label htmlFor="trial-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="trial-email"
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
            <Label htmlFor="country">Country</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
              <Select value={formData.country} onValueChange={handleCountryChange}>
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select your country">
                    {formData.country && selectedCountryData && (
                      <div className="flex items-center space-x-2">
                        <span>{selectedCountryData.flag}</span>
                        <span>{selectedCountryData.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {countriesData.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      <div className="flex items-center space-x-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobileNumber">Mobile Number</Label>
            <div className="flex space-x-2">
              <div className="w-28">
                <Select 
                  value={selectedCountryData?.dialCode || ''} 
                  onValueChange={(dialCode) => {
                    const country = countriesData.find(c => c.dialCode === dialCode);
                    if (country) {
                      handleCountryChange(country.name);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="+1">
                      {selectedCountryData ? (
                        <div className="flex items-center space-x-1">
                          <span>{selectedCountryData.flag}</span>
                          <span>{selectedCountryData.dialCode}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">+1</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {countriesData.map((country) => (
                      <SelectItem key={country.code} value={country.dialCode}>
                        <div className="flex items-center space-x-2">
                          <span>{country.flag}</span>
                          <span>{country.dialCode}</span>
                          <span className="text-sm text-muted-foreground">{country.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  placeholder="712345678"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {formData.currency && formData.timezone && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={formData.currency} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={formData.timezone} disabled className="bg-muted" />
              </div>
            </div>
          )}

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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="acceptTerms"
              checked={formData.acceptTerms}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, acceptTerms: checked as boolean })
              }
            />
            <Label htmlFor="acceptTerms" className="text-sm">
              I accept the{' '}
              <a href="/terms-of-service" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Start Free Trial'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};