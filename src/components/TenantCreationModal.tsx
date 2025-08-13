import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Star, Zap, Building2, Mail, User, Phone, Globe, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { countriesData, CountryData, getCountryByName } from '@/lib/countries-data';

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
  const [selectedCountryData, setSelectedCountryData] = useState<CountryData | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    mobileNumber: '',
    country: '',
    currency: '',
    timezone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  
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
          currency: formData.currency,
          timezone: formData.timezone,
          password: formData.password
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Extract subdomain from response
      const subdomain = data?.subdomain;
      const subdomainUrl = subdomain ? `https://${subdomain}` : null;

      toast({
        title: "Account Created Successfully!",
        description: `Welcome to VibePOS! Your business "${formData.businessName}" has been set up with a 14-day Enterprise trial. Check your email for login instructions.`,
        variant: "default"
      });

      onClose();
      
      // If we have a subdomain, redirect there, otherwise go to main auth
      setTimeout(() => {
        if (subdomainUrl) {
          window.location.href = subdomainUrl;
        } else {
          navigate('/auth');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Tenant creation error:', error);
      
      let errorMessage = "Failed to create account. Please try again.";
      
      // Handle different error types with specific messages
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        errorMessage = "An account with this email already exists. Please use a different email or sign in to your existing account.";
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = "Please provide a valid email address.";
      } else if (error.message?.includes('Password')) {
        errorMessage = "Password must be at least 6 characters long.";
      } else if (error.message?.includes('All fields are required')) {
        errorMessage = "Please fill in all required fields.";
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start Your Free Trial</DialogTitle>
          <DialogDescription>
            Create your VibePOS account and get immediate access to all Enterprise features. No credit card required.
          </DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="tenant-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="tenant-email"
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

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
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