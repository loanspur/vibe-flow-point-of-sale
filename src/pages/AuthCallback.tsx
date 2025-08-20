import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { OTPVerificationModal } from '@/components/OTPVerificationModal';
import { GoogleSignupBusinessForm } from '@/components/GoogleSignupBusinessForm';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUserInfo } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userFullName, setUserFullName] = useState('');
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
      setUserFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');

      // Check if we're on a main domain (centralized auth flow)
      const currentDomain = window.location.hostname;
      const isMainDomain = currentDomain === 'vibenet.shop' || 
                          currentDomain === 'vibenet.online' ||
                          currentDomain === 'www.vibenet.shop' || 
                          currentDomain === 'www.vibenet.online';

      // Check if this is a Google user and if they exist in our system
      const isGoogleAuth = searchParams.get('type') === 'google' || 
                          user.app_metadata?.provider === 'google';
      
      // Check if this is from trial signup
      const isFromTrial = searchParams.get('from') === 'trial' || 
                         sessionStorage.getItem('google-trial-signup') === 'true';

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
          // New Google user - show business form instead of just OTP
          setIsNewUser(true);
          await createGoogleUserProfile(user, isFromTrial);
          setShowBusinessForm(true);
          setLoading(false);
        } else {
          // Existing Google user - update profile and show OTP
          await updateGoogleUserProfile(user, profile);
          setShowOTPModal(true);
          setLoading(false);
        }
      } else {
        // Regular email/password auth
        await refreshUserInfo();
        
        if (isMainDomain) {
          // Check if user has a tenant for redirection
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single();

          if (profile?.tenant_id) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('subdomain')
              .eq('id', profile.tenant_id)
              .single();

            if (tenantData?.subdomain) {
              const tenantDomain = currentDomain.includes('vibenet.shop') 
                ? `${tenantData.subdomain}.vibenet.shop`
                : `${tenantData.subdomain}.vibenet.online`;
              
              window.location.href = `https://${tenantDomain}/dashboard`;
              return;
            }
          }
        }
        
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Unexpected callback error:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const createGoogleUserProfile = async (user: any, isFromTrial: boolean = false) => {
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
      
      // Check if we're on a main domain for potential redirection
      const currentDomain = window.location.hostname;
      const isMainDomain = currentDomain === 'vibenet.shop' || 
                          currentDomain === 'vibenet.online' ||
                          currentDomain === 'www.vibenet.shop' || 
                          currentDomain === 'www.vibenet.online';
      
      // Check if user already has a tenant (whether new or existing user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userId)
        .single();

      if (profile?.tenant_id) {
        // User has a tenant - redirect to their subdomain
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('subdomain, name')
          .eq('id', profile.tenant_id)
          .single();

        if (tenantData?.subdomain) {
          const tenantDomain = currentDomain.includes('vibenet.shop') 
            ? `${tenantData.subdomain}.vibenet.shop`
            : `${tenantData.subdomain}.vibenet.online`;
          
          toast({
            title: isNewUser ? "Welcome!" : "Welcome back!",
            description: `Redirecting you to ${tenantData.name}...`,
          });
          
          // Clear trial signup flag
          sessionStorage.removeItem('google-trial-signup');
          
          // Small delay to show the toast
          setTimeout(() => {
            window.location.href = `https://${tenantDomain}/dashboard`;
          }, 1000);
          return;
        }
      }
      
      if (isNewUser) {
        // This will be handled by the business form
        // The form will call handleBusinessFormSuccess after OTP verification
        toast({
          title: "Welcome!",
          description: "Please complete your business setup.",
        });
      } else {
        // Existing user without tenant - redirect to dashboard
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

  const createTenantForNewUser = async (businessData?: any) => {
    try {
      toast({
        title: "Creating your workspace...",
        description: "Setting up your business account.",
      });

      // Create tenant with collected business data or minimal info
      const { data, error } = await supabase.functions.invoke('create-tenant-trial', {
        body: {
          userId: userId,
          businessData: businessData || {
            businessName: userEmail.split('@')[0] + "'s Business", // Temporary name
            businessEmail: userEmail,
            businessPhone: '',
            address: '',
            country: 'Kenya'
          },
          planType: 'starter', // Default plan
          isGoogleUser: true
        }
      });

      if (error) {
        console.error('Tenant creation error:', error);
        throw error;
      }

      console.log('Tenant created:', data);

      // Refresh user info to get the new tenant
      await refreshUserInfo();

      // Now get the tenant info and redirect to subdomain
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userId)
        .single();

      if (profile?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('subdomain, name')
          .eq('id', profile.tenant_id)
          .single();

        if (tenantData?.subdomain) {
          const currentDomain = window.location.hostname;
          const tenantDomain = currentDomain.includes('vibenet.shop') 
            ? `${tenantData.subdomain}.vibenet.shop`
            : `${tenantData.subdomain}.vibenet.online`;
          
          toast({
            title: "Welcome to VibePOS!",
            description: "Redirecting you to your workspace to complete setup...",
          });
          
          // Redirect to tenant subdomain - the TenantSetupCompletion component will handle the rest
          setTimeout(() => {
            window.location.href = `https://${tenantDomain}/dashboard`;
          }, 1000);
          return;
        }
      }

      // Fallback if something goes wrong
      throw new Error('Failed to get tenant information');

    } catch (error) {
      console.error('Tenant creation failed:', error);
      toast({
        title: "Setup Error",
        description: "Failed to create your workspace. Please try again.",
        variant: "destructive"
      });
      
      // Fallback to manual tenant creation
      navigate('/trial-signup?google=true&step=tenant-data');
    }
  };

  const handleBusinessFormSuccess = async (businessData: any) => {
    setShowBusinessForm(false);
    
    try {
      // Clear trial signup flag
      sessionStorage.removeItem('google-trial-signup');
      
      // Create tenant with the collected business data
      await createTenantForNewUser(businessData);
    } catch (error) {
      console.error('Business form success error:', error);
      setError('Failed to create your workspace. Please try again.');
    }
  };

  const handleBusinessFormClose = () => {
    setShowBusinessForm(false);
    // Sign out the user since they didn't complete setup
    supabase.auth.signOut();
    navigate('/auth');
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

      {/* Business Data Collection Form for New Google Users */}
      <GoogleSignupBusinessForm
        isOpen={showBusinessForm}
        onClose={handleBusinessFormClose}
        onSuccess={handleBusinessFormSuccess}
        email={userEmail}
        userId={userId}
        userFullName={userFullName}
      />

      {/* OTP Verification Modal for Existing Users */}
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
