import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Eye, EyeOff, AlertCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  // Error states
  const [signInError, setSignInError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetEmailError, setResetEmailError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Redirect if already authenticated - with infinite loop prevention
  useEffect(() => {
    if (user) {
      console.log('👤 User authenticated, redirecting...');
      
      // Check if this is a subdomain
      const hostname = window.location.hostname;
      const isProductionSubdomain = hostname.endsWith('.vibenet.shop') && hostname !== 'vibenet.shop';
      const isStagingSubdomain = hostname.includes('-') && hostname.endsWith('.lovable.app');
      const isSubdomain = isProductionSubdomain || isStagingSubdomain;
      
      if (isSubdomain) {
        // For subdomains, redirect to main domain to prevent infinite loops on unresolved subdomains
        console.log('🌐 Subdomain detected, redirecting to main domain');
        window.location.href = isProductionSubdomain 
          ? 'https://vibenet.shop/dashboard' 
          : '/dashboard';
        return;
      }
      
      // For main domain, redirect to dashboard
      console.log('🎯 Main domain, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setSignInError('');
    setEmailError('');
    setPasswordError('');

    // Validate inputs
    const emailValidation = validateEmail(signInData.email);
    const passwordValidation = validatePassword(signInData.password);

    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }

    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    setLoading(true);

    console.log('🔐 Attempting sign in for:', signInData.email);
    const { error } = await signIn(signInData.email, signInData.password);

    if (error) {
      console.error('❌ Sign in error:', error);
      // Handle specific auth errors
      if (error.message.includes('Invalid login credentials')) {
        setSignInError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        setSignInError('Please check your email and click the confirmation link before signing in.');
      } else if (error.message.includes('Too many requests')) {
        setSignInError('Too many login attempts. Please wait a few minutes before trying again.');
      } else if (error.message.includes('User not found')) {
        setSignInError('No account found with this email address.');
      } else {
        setSignInError(error.message || 'Sign in failed. Please try again.');
      }
    } else {
      console.log('✅ Sign in successful');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in."
      });
      
      // Check if this is a subdomain
      const hostname = window.location.hostname;
      const isProductionSubdomain = hostname.endsWith('.vibenet.shop') && hostname !== 'vibenet.shop';
      const isStagingSubdomain = hostname.includes('-') && hostname.endsWith('.lovable.app');
      const isSubdomain = isProductionSubdomain || isStagingSubdomain;
      
      if (isSubdomain) {
        // For subdomains, redirect to main domain 
        console.log('🌐 Subdomain login, redirecting to main domain');
        window.location.href = isProductionSubdomain 
          ? 'https://vibenet.shop/dashboard' 
          : '/dashboard';
        return;
      }
      
      // For main domain, redirect to dashboard
      console.log('🎯 Main domain login, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors and success messages
    setResetEmailError('');
    setResetSuccess('');

    // Validate email
    const emailValidation = validateEmail(resetEmail);
    if (emailValidation) {
      setResetEmailError(emailValidation);
      return;
    }

    setResetLoading(true);

    try {
      // Send OTP for password reset using our custom function
      const { data: otpResult, error: otpError } = await supabase.functions.invoke(
        'send-otp-verification',
        {
          body: { 
            email: resetEmail,
            otpType: 'password_reset'
          }
        }
      );

      if (otpError) {
        console.error('Error sending OTP:', otpError);
        setResetEmailError('Failed to send verification code. Please try again.');
      } else {
        setResetSuccess('A verification code has been sent to your email address. Please check your inbox.');
        // Redirect to reset password page with email pre-filled
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(resetEmail)}`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setResetEmailError('An unexpected error occurred. Please try again later.');
    }

    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
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
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{showForgotPassword ? 'Reset Password' : 'Sign In'}</CardTitle>
            <CardDescription>
              {showForgotPassword 
                ? 'Enter your email address and we\'ll send you a verification code to reset your password.'
                : 'Access your vibePOS dashboard'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Global sign-in error */}
            {signInError && !showForgotPassword && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{signInError}</AlertDescription>
              </Alert>
            )}
            
            {/* Reset success message */}
            {resetSuccess && showForgotPassword && (
              <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
                <Mail className="h-4 w-4" />
                <AlertDescription>{resetSuccess}</AlertDescription>
              </Alert>
            )}
            
            {!showForgotPassword ? (
              <div className="w-full">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signInData.email}
                      onChange={(e) => {
                        setSignInData({ ...signInData, email: e.target.value });
                        setEmailError(''); // Clear error when user types
                      }}
                      className={emailError ? 'border-destructive focus:border-destructive' : ''}
                    />
                    {emailError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {emailError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={signInData.password}
                        onChange={(e) => {
                          setSignInData({ ...signInData, password: e.target.value });
                          setPasswordError(''); // Clear error when user types
                        }}
                        className={`pr-10 ${passwordError ? 'border-destructive focus:border-destructive' : ''}`}
                        placeholder="Enter your password"
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
                    {passwordError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {passwordError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setResetEmailError(''); // Clear error when user types
                    }}
                    className={resetEmailError ? 'border-destructive focus:border-destructive' : ''}
                  />
                  {resetEmailError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {resetEmailError}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailError('');
                      setResetSuccess('');
                      setResetEmail('');
                    }}
                  >
                    Back to Sign In
                  </Button>
                  <Button type="submit" className="flex-1" disabled={resetLoading}>
                    {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Verification Code
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;