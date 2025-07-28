import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  
  // Error states
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    otpCode: '',
    password: '',
    confirmPassword: ''
  });

  // Get email from URL params
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }));
    }
  }, [searchParams]);

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setOtpError('');
    
    if (!formData.otpCode || formData.otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      console.log('Verifying OTP with data:', {
        email: formData.email,
        otpCode: formData.otpCode,
        otpType: 'password_reset'
      });
      
      // First verify if email exists and get basic info
      const { data: verificationResult, error: verificationError } = await supabase.functions.invoke(
        'verify-email-exists',
        {
          body: { email: formData.email }
        }
      );

      if (verificationError || !verificationResult?.exists) {
        setOtpError('Email address not found. Please check your email.');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email: formData.email,
          otpCode: formData.otpCode,
          otpType: 'password_reset'
        }
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        
        // Handle specific error types
        if (error.message?.includes('rate limit')) {
          setOtpError('Too many attempts. Please wait before trying again.');
        } else if (error.message?.includes('Invalid or expired')) {
          setOtpError('Invalid or expired verification code. Please try again or request a new code.');
        } else {
          setOtpError('Failed to verify code. Please try again.');
        }
      } else if (data?.success) {
        setStep('password');
        toast({
          title: "Code verified",
          description: "Please enter your new password."
        });
      } else {
        setOtpError('Invalid or expired verification code. Please try again or request a new code.');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setOtpError('Failed to verify code. Please try again or request a new code.');
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setPasswordError('');

    // Validate passwords
    const passwordValidation = validatePassword(formData.password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email: formData.email,
          otpCode: formData.otpCode,
          otpType: 'password_reset',
          newPassword: formData.password
        }
      });

      if (error) {
        console.error('Error resetting password:', error);
        setPasswordError('Failed to reset password. Please try again.');
      } else if (data?.success) {
        setResetComplete(true);
        toast({
          title: "Password updated successfully",
          description: "Your password has been reset. You can now sign in with your new password."
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        setPasswordError('Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setPasswordError('An unexpected error occurred. Please try again.');
    }

    setLoading(false);
  };

  const resendOTP = async () => {
    setLoading(true);
    setOtpError('');

    try {
      const { error } = await supabase.functions.invoke('send-otp-verification', {
        body: {
          email: formData.email,
          otpType: 'password_reset'
        }
      });

      if (error) {
        setOtpError('Failed to resend verification code. Please try again.');
      } else {
        toast({
          title: "Code sent",
          description: "A new verification code has been sent to your email."
        });
      }
    } catch (error) {
      setOtpError('Failed to resend verification code. Please try again.');
    }

    setLoading(false);
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-green-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-green-600">Password Reset Complete</CardTitle>
              <CardDescription>
                Your password has been successfully updated.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                You will be redirected to the sign-in page in a few seconds.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">
                  Sign In Now
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/auth">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </Button>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">V</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              vibePOS
            </span>
          </div>
          <p className="text-muted-foreground">
            {step === 'otp' ? 'Enter verification code' : 'Set your new password'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'otp' ? 'Verify Code' : 'Reset Password'}
            </CardTitle>
            <CardDescription>
              {step === 'otp' 
                ? `Enter the 6-digit code sent to ${formData.email}`
                : 'Enter your new password below'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'otp' ? (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {otpError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{otpError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="otpCode">Verification Code</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    value={formData.otpCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only digits
                      setFormData({ ...formData, otpCode: value });
                      setOtpError('');
                    }}
                    placeholder="Enter 6-digit code"
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={resendOTP}
                    disabled={loading}
                    className="text-sm"
                  >
                    Didn't receive the code? Resend
                  </Button>
                </div>

                <Button type="submit" className="w-full" disabled={loading || formData.otpCode.length !== 6}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        setPasswordError('');
                      }}
                      required
                      minLength={6}
                      className="pr-10"
                      placeholder="Enter your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        setPasswordError('');
                      }}
                      required
                      minLength={6}
                      className="pr-10"
                      placeholder="Confirm your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Password must be at least 6 characters long.
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;