import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimeout, setResendTimeout] = useState(0);
  const [userId, setUserId] = useState<string>('');
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, check if user exists and get user ID
      const { error: otpError } = await supabase.functions.invoke('send-otp-verification', {
        body: {
          email: email.trim(),
          otpType: 'password_reset'
        }
      });

      if (otpError) {
        toast({
          title: "Error",
          description: "Failed to send reset code. Please check your email address.",
          variant: "destructive",
        });
        return;
      }

      // User ID will be handled by the edge function

      toast({
        title: "Success",
        description: "Password reset code sent to your email",
      });
      
      setStep('otp');
      
      // Start resend timeout
      setResendTimeout(60);
      const timer = setInterval(() => {
        setResendTimeout(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send reset code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email,
          otpCode,
          otpType: 'password_reset',
          newPassword
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: "Invalid or expired code",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Password reset successfully!",
      });
      
      setStep('success');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimeout > 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp-verification', {
        body: {
          email: email.trim(),
          otpType: 'password_reset'
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to resend code",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "New code sent to your email",
      });
      
      // Start resend timeout
      setResendTimeout(60);
      const timer = setInterval(() => {
        setResendTimeout(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to resend code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            {step === 'email' && "Enter your email to receive a reset code"}
            {step === 'otp' && "Enter the code sent to your email"}
            {step === 'success' && "Password reset successfully"}
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {step === 'email' && "Enter Email"}
              {step === 'otp' && "Verify & Reset"}
              {step === 'success' && "Success!"}
            </CardTitle>
            <CardDescription>
              {step === 'email' && "We'll send you a 6-digit verification code"}
              {step === 'otp' && "Enter the code and your new password"}
              {step === 'success' && "Your password has been reset"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {step === 'email' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    disabled={loading}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
                  />
                </div>
                
                <Button
                  onClick={handleSendOTP}
                  disabled={loading || !email.trim()}
                  className="w-full"
                >
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </Button>
              </>
            )}

            {step === 'otp' && (
              <>
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    We've sent a 6-digit code to {email}. Check your email and enter it below.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="otpCode">Verification Code</Label>
                  <Input
                    id="otpCode"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-lg tracking-wider"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code expires in 10 minutes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Button
                    variant="ghost"
                    onClick={handleResendOTP}
                    disabled={loading || resendTimeout > 0}
                    size="sm"
                  >
                    {resendTimeout > 0 ? `Resend in ${resendTimeout}s` : 'Resend Code'}
                  </Button>
                  
                  <Button
                    onClick={handleVerifyAndReset}
                    disabled={loading || otpCode.length !== 6 || !newPassword || !confirmPassword}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </div>
              </>
            )}

            {step === 'success' && (
              <>
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Password Reset Complete
                  </h3>
                  <p className="text-gray-600">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                </div>
                
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  Sign In
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link 
            to="/auth" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}