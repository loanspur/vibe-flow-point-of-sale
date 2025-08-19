import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { OTPVerificationModal } from '@/components/OTPVerificationModal';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUserInfo } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the session from URL params
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed. Please try again.');
        return;
      }

      const session = data.session;
      if (!session?.user) {
        setError('No user session found. Please try signing in again.');
        return;
      }

      const user = session.user;
      setUserId(user.id);
      setUserEmail(user.email || '');

      // Check if this is a Google user and if they exist in our system
      const isGoogleAuth = searchParams.get('type') === 'google' || 
                          user.app_metadata?.provider === 'google';

      if (isGoogleAuth) {
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile check error:', profileError);
          setError('Failed to check user profile. Please try again.');
          return;
        }

        if (!profile) {
          // New Google user - create profile and require OTP verification
          setIsNewUser(true);
          await createGoogleUserProfile(user);
        } else {
          // Existing Google user - require OTP for login verification
          await updateGoogleUserProfile(user, profile);
        }

        // Always require OTP verification for Google users
        setShowOTPModal(true);
        setLoading(false);
      } else {
        // Regular email/password auth - redirect to dashboard
        await refreshUserInfo();
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Unexpected callback error:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const createGoogleUserProfile = async (user: any) => {
    try {
      const googleData = {
        google_id: user.user_metadata?.iss + '/' + user.user_metadata?.sub,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        provider_data: user.user_metadata
      };

      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: googleData.full_name,
          avatar_url: googleData.avatar_url,
          google_id: googleData.google_id,
          auth_method: 'google',
          otp_required_always: true,
          google_profile_data: googleData.provider_data,
          role: 'user'
        });

      if (error) {
        console.error('Profile creation error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to create Google profile:', error);
      throw error;
    }
  };

  const updateGoogleUserProfile = async (user: any, existingProfile: any) => {
    try {
      // Update Google data if needed
      const updates: any = {
        otp_required_always: true,
        auth_method: existingProfile.auth_method === 'email' ? 'both' : 'google'
      };

      // Update Google ID and profile data if missing
      if (!existingProfile.google_id) {
        updates.google_id = user.user_metadata?.iss + '/' + user.user_metadata?.sub;
      }

      if (!existingProfile.google_profile_data) {
        updates.google_profile_data = user.user_metadata;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update Google profile:', error);
      throw error;
    }
  };

  const handleOTPSuccess = async () => {
    setShowOTPModal(false);
    
    try {
      await refreshUserInfo();
      
      if (isNewUser) {
        // New Google user - redirect to tenant data collection
        toast({
          title: "Welcome!",
          description: "Please complete your business information to get started.",
        });
        navigate('/trial-signup?google=true&step=tenant-data');
      } else {
        // Existing user - redirect to dashboard
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setError('Login successful but navigation failed. Please refresh the page.');
    }
  };

  const handleOTPClose = () => {
    setShowOTPModal(false);
    // Sign out the user since they didn't complete verification
    supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle>Processing Sign In</CardTitle>
            <CardDescription>
              Please wait while we set up your account...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Back to Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Almost There!</CardTitle>
          <CardDescription>
            Please verify your email to complete the sign-in process.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={showOTPModal}
        onClose={handleOTPClose}
        onSuccess={handleOTPSuccess}
        email={userEmail}
        userId={userId}
        title="Verify Your Email"
        description="For security, we need to verify your email address before you can continue."
        otpType="login_verification"
      />
    </div>
  );
}
