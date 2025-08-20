import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Building2, User, MapPin, Phone, Mail } from 'lucide-react';

interface TenantDataCollectionProps {
  onSuccess?: () => void;
  isGoogleUser?: boolean;
}

export function TenantDataCollection({ onSuccess, isGoogleUser = false }: TenantDataCollectionProps) {
  const navigate = useNavigate();
  const { user, refreshUserInfo } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Business Information
    businessName: '',
    businessType: '',
    industry: '',
    businessDescription: '',
    
    // Contact Information  
    businessPhone: '',
    businessEmail: user?.email || '',
    
    // Address Information
    country: 'Kenya',
    state: '',
    city: '',
    address: '',
    postalCode: '',
    
    // Additional Information
    website: '',
    taxNumber: '',
    registrationNumber: '',
    
    // Owner Information (pre-filled from Google if available)
    ownerName: user?.user_metadata?.full_name || '',
    ownerPhone: '',
    ownerEmail: user?.email || ''
  });

  const businessTypes = [
    'Retail Store',
    'Restaurant/Food Service',
    'Professional Services', 
    'Healthcare',
    'Beauty/Salon',
    'Automotive',
    'Technology',
    'Manufacturing',
    'Wholesale',
    'Other'
  ];

  const kenyaStates = [
    'Nairobi', 'Mombasa', 'Nakuru', 'Eldoret', 'Kisumu', 'Thika',
    'Malindi', 'Kitale', 'Garissa', 'Kakamega', 'Machakos', 'Meru',
    'Nyeri', 'Kericho', 'Kiambu', 'Other'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = [
      'businessName', 'businessType', 'businessPhone', 'businessEmail',
      'country', 'city', 'address', 'ownerName'
    ];

    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Missing Information",
          description: `Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          variant: "destructive"
        });
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.businessEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid business email address",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!user) {
      toast({
        title: "Error",
        description: "No user session found. Please sign in again.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Create tenant and business setup with highest plan
      const { data, error } = await supabase.functions.invoke('create-tenant-trial', {
        body: {
          userId: user.id,
          businessData: formData,
          planType: 'highest', // Always assign highest plan for trials
          isGoogleUser
        }
      });

      if (error) {
        console.error('Tenant creation error:', error);
        throw new Error(error.message || 'Failed to create business account');
      }

      if (data?.success) {
        // Refresh user info to get updated tenant data
        await refreshUserInfo();
        
        toast({
          title: "Welcome to VibePOS!",
          description: "Your business account has been created successfully. Redirecting to your workspace...",
          variant: "default"
        });

        // Fetch the newly created tenant's subdomain and redirect
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('tenant_id')
              .eq('user_id', user.id)
              .single();

            if (profile?.tenant_id) {
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('subdomain, name')
                .eq('id', profile.tenant_id)
                .single();

              if (tenantData?.subdomain) {
                // Determine the current domain to use the same TLD
                const currentDomain = window.location.hostname;
                const tenantDomain = currentDomain.includes('vibenet.shop') 
                  ? `${tenantData.subdomain}.vibenet.shop`
                  : `${tenantData.subdomain}.vibenet.online`;
                
                console.log('Redirecting to tenant domain:', tenantDomain);
                
                // Redirect to the tenant's subdomain dashboard
                window.location.href = `https://${tenantDomain}/dashboard`;
                return;
              }
            }
            
            // Fallback - if tenant data lookup fails, just redirect to dashboard
            console.warn('Could not find tenant subdomain, using fallback redirect');
            onSuccess?.();
            navigate('/dashboard');
          } catch (error) {
            console.error('Failed to fetch tenant data for redirect:', error);
            // Fallback redirect
            onSuccess?.();
            navigate('/dashboard');
          }
        }, 1500);
      } else {
        throw new Error('Tenant creation failed');
      }

    } catch (error: any) {
      console.error('Business setup error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set up your business account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">V</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              vibePOS
            </span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Complete Your Business Setup</h1>
          <p className="text-muted-foreground">
            {isGoogleUser 
              ? "We've created your account! Now let's set up your business details to get started."
              : "Please provide your business information to activate your account."
            }
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>
              Tell us about your business to customize your VibePOS experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Details */}
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
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  value={formData.businessDescription}
                  onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                  placeholder="Brief description of your business"
                  rows={3}
                />
              </div>

              {/* Contact Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone *</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                      placeholder="+254 700 000000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Business Email *</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                      placeholder="business@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Business Address
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="Uganda">Uganda</SelectItem>
                        <SelectItem value="Tanzania">Tanzania</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">County/State</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select county/state" />
                      </SelectTrigger>
                      <SelectContent>
                        {kenyaStates.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="00100"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Street address, building, floor"
                  />
                </div>
              </div>

              {/* Owner Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Owner Information
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Full Name *</Label>
                    <Input
                      id="ownerName"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      placeholder="Your full name"
                      disabled={isGoogleUser && formData.ownerName} // Disable if pre-filled from Google
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">Personal Phone</Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      value={formData.ownerPhone}
                      onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                      placeholder="+254 700 000000"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://www.yourbusiness.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="taxNumber">Tax Number</Label>
                    <Input
                      id="taxNumber"
                      value={formData.taxNumber}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      placeholder="KRA PIN or Tax ID"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="registrationNumber">Business Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    placeholder="Business registration/license number"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="flex-1"
                >
                  Back to Sign In
                </Button>
                
                <Button 
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting Up...
                    </>
                  ) : (
                    'Complete Setup & Start Trial'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}