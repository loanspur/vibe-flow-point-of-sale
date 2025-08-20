import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, User, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { OTPVerificationModal } from './OTPVerificationModal';
import { useDebounce } from '@/hooks/useDebounce';
import { countries } from '@/lib/countries';

interface GoogleSignupBusinessFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (businessData: any) => void;
  email: string;
  userId: string;
  userFullName?: string;
}

export function GoogleSignupBusinessForm({
  isOpen,
  onClose,
  onSuccess,
  email,
  userId,
  userFullName
}: GoogleSignupBusinessFormProps) {
  const [step, setStep] = useState<'business-data' | 'otp'>('business-data');
  const [businessData, setBusinessData] = useState<any>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    businessName: userFullName ? `${userFullName}'s Business` : '',
    businessType: '',
    businessPhone: '',
    address: '',
    city: '',
    state: '',
    country: 'Kenya',
    postalCode: '',
    website: '',
    subdomain: '',
    businessDescription: ''
  });

  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const debouncedSubdomain = useDebounce(formData.subdomain, 500);

  // Auto-generate subdomain from business name
  const generateSubdomain = (businessName: string) => {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate subdomain when business name changes
      if (field === 'businessName' && !prev.subdomain) {
        updated.subdomain = generateSubdomain(value);
      }
      
      return updated;
    });
  };

  // Check subdomain availability
  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    setSubdomainChecking(true);
    try {
      const { data, error } = await supabase.rpc('is_domain_available', {
        domain_name_param: subdomain
      });

      if (error) {
        console.error('Subdomain check error:', error);
        setSubdomainAvailable(null);
      } else {
        setSubdomainAvailable(data);
      }
    } catch (error) {
      console.error('Subdomain availability error:', error);
      setSubdomainAvailable(null);
    } finally {
      setSubdomainChecking(false);
    }
  };

  // Check subdomain when it changes
  useEffect(() => {
    if (debouncedSubdomain) {
      checkSubdomainAvailability(debouncedSubdomain);
    }
  }, [debouncedSubdomain]);

  const handleBusinessDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.businessName || !formData.subdomain) {
      toast({
        title: "Missing Information",
        description: "Please fill in business name and subdomain.",
        variant: "destructive"
      });
      return;
    }

    if (subdomainAvailable === false) {
      toast({
        title: "Subdomain Unavailable",
        description: "Please choose a different subdomain.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Submitting business data for new Google user');
      
      // Store the business data for later use
      const businessInfo = {
        businessName: formData.businessName,
        businessEmail: email,
        businessPhone: formData.businessPhone,
        businessType: formData.businessType,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode,
        website: formData.website,
        subdomain: formData.subdomain,
        businessDescription: formData.businessDescription
      };
      
      setBusinessData(businessInfo);
      
      console.log('Sending OTP for email verification');
      
      // Send OTP for email verification
      const { error } = await supabase.functions.invoke('send-otp-verification', {
        body: {
          email: email,
          otpType: 'login_verification',
          userId: userId,
          recipientName: userFullName || formData.businessName
        }
      });

      if (error) {
        console.error('OTP send error:', error);
        toast({
          title: "Error",
          description: "Failed to send verification code. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Show OTP verification within this form
      setStep('otp');
      setShowOTPModal(true);
      
      toast({
        title: "Verification Code Sent",
        description: `Please check your email at ${email} for the verification code.`,
      });
    } catch (error) {
      console.error('Business data submission error:', error);
      toast({
        title: "Error",
        description: "Failed to process your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    console.log('OTP verification successful, creating profile and calling onSuccess');
    setShowOTPModal(false);
    
    // Create the profile now that OTP is verified
    createGoogleUserProfile().then(() => {
      // Pass the collected business data to the parent
      onSuccess(businessData);
    }).catch((error) => {
      console.error('Profile creation after OTP failed:', error);
      toast({
        title: "Error",
        description: "Failed to create user profile. Please try again.",
        variant: "destructive"
      });
    });
  };

  const createGoogleUserProfile = async () => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user) {
        const googleData = {
          google_id: authUser.user.user_metadata?.iss + '/' + authUser.user.user_metadata?.sub,
          email: authUser.user.email,
          full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name,
          avatar_url: authUser.user.user_metadata?.avatar_url || authUser.user.user_metadata?.picture,
          provider_data: authUser.user.user_metadata
        };

        console.log('Creating Google user profile:', googleData);

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            full_name: googleData.full_name,
            avatar_url: googleData.avatar_url,
            google_id: googleData.google_id,
            auth_method: 'google',
            otp_required_always: true,
            google_profile_data: googleData.provider_data,
            role: 'user'
          });

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }

        console.log('Google user profile created successfully');
      }
    } catch (error) {
      console.error('Failed to create Google profile:', error);
      throw error;
    }
  };

  const handleOTPClose = () => {
    setShowOTPModal(false);
    // Go back to business data form
    setStep('business-data');
  };

  const handleClose = () => {
    setShowOTPModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {step === 'business-data' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Complete Your Business Setup
              </CardTitle>
              <CardDescription>
                Before we create your workspace, please provide your business details. 
                We'll then verify your email to complete the setup.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleBusinessDataSubmit} className="space-y-6">
                {/* Business Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold">Business Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">
                        Business Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        placeholder="Enter your business name"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                </div>

                {/* Subdomain Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold">Choose Your Subdomain</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">
                      Subdomain <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="subdomain"
                        value={formData.subdomain}
                        onChange={(e) => handleInputChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="your-business-name"
                        pattern="[a-z0-9-]+"
                        minLength={3}
                        maxLength={20}
                        required
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        .vibenet.shop
                      </span>
                    </div>
                    {subdomainChecking && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking availability...
                      </p>
                    )}
                    {subdomainAvailable === true && (
                      <p className="text-xs text-green-600">✓ Subdomain is available!</p>
                    )}
                    {subdomainAvailable === false && (
                      <p className="text-xs text-destructive">✗ Subdomain is not available</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This will be your business URL: {formData.subdomain || 'your-subdomain'}.vibenet.shop
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold">Contact Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessEmail">Business Email</Label>
                      <Input
                        id="businessEmail"
                        type="email"
                        value={email}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        This email will be verified in the next step
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="businessPhone">Business Phone</Label>
                      <Input
                        id="businessPhone"
                        type="tel"
                        value={formData.businessPhone}
                        onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                        placeholder="e.g., +254 123 456 789"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold">Address Information</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Enter your business address"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="City"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          placeholder="State or Province"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          placeholder="Postal Code"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.name}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Optional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Optional Information</h3>
                  
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
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading || subdomainAvailable === false}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Continue to Email Verification'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={showOTPModal}
        onClose={handleOTPClose}
        onSuccess={handleOTPSuccess}
        email={email}
        userId={userId}
        title="Verify Your Email"
        description="We've sent a verification code to your email. Please enter it below to complete your business setup."
        otpType="login_verification"
      />
    </>
  );
}