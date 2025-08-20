import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, RefreshCw, Building2 } from 'lucide-react';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (businessData?: any) => void;
  email: string;
  userId: string;
  title?: string;
  description?: string;
  otpType?: 'email_verification' | 'login_verification';
  isNewUser?: boolean;
  userFullName?: string;
}

export function OTPVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  email,
  userId,
  title = "Verify Your Email",
  description = "We've sent a 6-digit verification code to your email address.",
  otpType = 'email_verification',
  isNewUser = false,
  userFullName = ""
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Business form data for new users
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'retail',
    businessDescription: '',
    subdomain: '',
    firstName: userFullName.split(' ')[0] || '',
    lastName: userFullName.split(' ').slice(1).join(' ') || '',
    phone: '',
    country: 'Kenya',
    city: '',
    address: ''
  });
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

  // Timer for OTP expiry
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Track if we've sent initial OTP for this modal session
  const initialOtpSentRef = useRef(false);

  // Send initial OTP when modal opens and reset state
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setError('');
      setTimeLeft(300);
      setCanResend(false);
      initialOtpSentRef.current = false; // Reset for new session
      
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      
      // Send initial OTP only once per modal session
      if (!initialOtpSentRef.current) {
        sendInitialOTP();
        initialOtpSentRef.current = true;
      }
    }
  }, [isOpen]); // Only depend on isOpen, not the other values

  const sendInitialOTP = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-otp-verification', {
        body: {
          email,
          userId,
          otpType
        }
      });

      if (error) {
        setError('Failed to send verification code. Please try again.');
      }
    } catch (error) {
      setError('Failed to send verification code. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 6).split('');
      const newOtp = [...otp.split('')];
      digits.forEach((digit, i) => {
        if (index + i < 6 && /^\d$/.test(digit)) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp.join(''));
      
      // Focus next empty input or last input
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else if (/^\d$/.test(value) || value === '') {
      // Single digit input
      const newOtp = otp.split('');
      newOtp[index] = value;
      setOtp(newOtp.join(''));
      
      // Auto-move to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
    
    setError(''); // Clear error when user types
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Business form validation and utilities
  const validateForm = () => {
    const errors = [];
    if (!formData.businessName.trim()) errors.push('Business name is required');
    if (!formData.subdomain.trim()) errors.push('Subdomain is required');
    if (!formData.firstName.trim()) errors.push('First name is required');
    if (!formData.lastName.trim()) errors.push('Last name is required');
    if (!formData.phone.trim()) errors.push('Phone number is required');
    if (!formData.country.trim()) errors.push('Country is required');
    if (formData.subdomain && subdomainAvailable === false) errors.push('Subdomain is not available');
    
    return errors;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate subdomain from business name
    if (field === 'businessName') {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, subdomain }));
    }
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    setSubdomainChecking(true);
    try {
      // Check if subdomain is already taken by querying tenants table
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle();

      if (error) {
        console.error('Subdomain check error:', error);
        setSubdomainAvailable(null);
      } else {
        // If data exists, subdomain is taken; if null, it's available
        setSubdomainAvailable(data === null);
      }
    } catch (error) {
      console.error('Subdomain check failed:', error);
      setSubdomainAvailable(null);
    } finally {
      setSubdomainChecking(false);
    }
  };

  // Debounced subdomain checking
  useEffect(() => {
    if (!isNewUser) return;
    
    const timer = setTimeout(() => {
      checkSubdomainAvailability(formData.subdomain);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.subdomain, isNewUser]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    // For new users, validate business form
    if (isNewUser) {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          userId,
          email,
          otpCode: otp,
          otpType
        }
      });

      if (error) {
        console.error('OTP verification error:', error);
        if (error.message?.includes('expired')) {
          setError('Verification code has expired. Please request a new one.');
          setCanResend(true);
        } else if (error.message?.includes('invalid')) {
          setError('Invalid verification code. Please try again.');
        } else if (error.message?.includes('attempts')) {
          setError('Too many attempts. Please request a new code.');
          setCanResend(true);
        } else {
          setError('Verification failed. Please try again.');
        }
        return;
      }

      if (data.success) {
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified.",
        });
        
        // For new users, create profile and pass business data
        if (isNewUser) {
          await createGoogleUserProfile();
          onSuccess(formData);
        } else {
          onSuccess();
        }
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createGoogleUserProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Failed to get user data');
      }

      const user = userData.user;
      
      // Create profile with business-related information
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: 'admin',
          auth_method: 'google',
          google_id: user.user_metadata?.iss + '/' + user.user_metadata?.sub,
          google_profile_data: user.user_metadata,
          otp_required_always: true
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      // Profile created successfully
    } catch (error) {
      console.error('Failed to create Google user profile:', error);
      throw error;
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');

    try {
      const { error } = await supabase.functions.invoke('send-otp-verification', {
        body: {
          email,
          userId,
          otpType
        }
      });

      if (error) {
        setError('Failed to resend code. Please try again.');
      } else {
        toast({
          title: "Code Resent",
          description: "A new verification code has been sent to your email.",
        });
        setTimeLeft(300);
        setCanResend(false);
        setOtp('');
      }
    } catch (error) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={isNewUser ? "sm:max-w-2xl max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {isNewUser ? <Building2 className="h-6 w-6 text-primary" /> : <Shield className="h-6 w-6 text-primary" />}
          </div>
          <DialogTitle className="text-xl">
            {isNewUser ? "Complete Your Business Setup" : title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isNewUser 
              ? "Please provide your business details and verify your email to continue."
              : description
            }
            <br />
            <span className="font-medium">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Business Information Section - Only for new users */}
          {isNewUser && (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="Enter your business name"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail Store</SelectItem>
                        <SelectItem value="restaurant">Restaurant/Food Service</SelectItem>
                        <SelectItem value="services">Professional Services</SelectItem>
                        <SelectItem value="wholesale">Wholesale/Distribution</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessDescription">Business Description</Label>
                    <Textarea
                      id="businessDescription"
                      placeholder="Briefly describe your business"
                      value={formData.businessDescription}
                      onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                      className="bg-background resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="subdomain">Your Store URL *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="subdomain"
                        placeholder="your-business"
                        value={formData.subdomain}
                        onChange={(e) => handleInputChange('subdomain', e.target.value)}
                        className="bg-background"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">.vibenet.shop</span>
                    </div>
                    {subdomainChecking && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Checking availability...</span>
                      </div>
                    )}
                    {subdomainAvailable === false && (
                      <p className="text-sm text-destructive">This subdomain is not available</p>
                    )}
                    {subdomainAvailable === true && (
                      <p className="text-sm text-green-600">This subdomain is available!</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Owner Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="Uganda">Uganda</SelectItem>
                        <SelectItem value="Tanzania">Tanzania</SelectItem>
                        <SelectItem value="Rwanda">Rwanda</SelectItem>
                        <SelectItem value="Nigeria">Nigeria</SelectItem>
                        <SelectItem value="Ghana">Ghana</SelectItem>
                        <SelectItem value="South Africa">South Africa</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Enter your city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Enter your business address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTP Verification Section */}
          <div className="space-y-4">
            {isNewUser && <h3 className="text-lg font-semibold text-foreground">Email Verification</h3>}
            
            <div className="flex justify-center space-x-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="w-12 h-12 text-center text-lg font-bold"
                  value={otp[index] || ''}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                />
              ))}
            </div>

            {/* Timer and Resend */}
            <div className="text-center text-sm text-muted-foreground">
              {timeLeft > 0 ? (
                <p>Code expires in {formatTime(timeLeft)}</p>
              ) : (
                <p>Code has expired</p>
              )}
              
              <div className="mt-2">
                {canResend || timeLeft === 0 ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={resending}
                    className="h-auto p-0"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Resend Code
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs">
                    Didn't receive the code? You can resend in {formatTime(timeLeft)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isNewUser ? 'Verifying & Creating Account...' : 'Verifying...'}
                </>
              ) : (
                isNewUser ? 'Verify Email & Create Account' : 'Verify Code'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}