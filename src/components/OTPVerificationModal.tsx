import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, RefreshCw } from 'lucide-react';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email: string;
  userId: string;
  title?: string;
  description?: string;
  otpType?: 'email_verification' | 'login_verification';
}

export function OTPVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  email,
  userId,
  title = "Verify Your Email",
  description = "We've sent a 6-digit verification code to your email address.",
  otpType = 'email_verification'
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Send initial OTP when modal opens and reset state
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setError('');
      setTimeLeft(300);
      setCanResend(false);
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      
      // Send initial OTP
      sendInitialOTP();
    }
  }, [isOpen, email, userId, otpType]);

  const sendInitialOTP = async () => {
    try {
      console.log('Sending initial OTP to:', email, 'for user:', userId, 'type:', otpType);
      
      const { error } = await supabase.functions.invoke('send-otp-verification', {
        body: {
          email,
          userId,
          otpType
        }
      });

      if (error) {
        console.error('Failed to send initial OTP:', error);
        setError('Failed to send verification code. Please try again.');
      } else {
        console.log('Initial OTP sent successfully');
      }
    } catch (error) {
      console.error('Error sending initial OTP:', error);
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

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
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

      if (data.verified) {
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified.",
        });
        onSuccess();
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
            <br />
            <span className="font-medium">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OTP Input */}
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

          {/* Verify Button */}
          <Button
            onClick={handleVerifyOTP}
            disabled={loading || otp.length !== 6}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
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
      </DialogContent>
    </Dialog>
  );
}