import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { OTPVerificationModal } from '@/components/OTPVerificationModal';
import { domainManager } from '@/lib/domain-manager';

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
  const [userFullName, setUserFullName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('=== UNIFIED AUTH CALLBACK STARTED ===');
      
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

      console.log('Auth callback - User ID:', user.id, 'Email:', user.email);

      // Use domain manager to get domain configuration
      const domainConfig = await domainManager.getCurrentDomainConfig();
      console.log('Domain config:', domainConfig);

      const isGoogleAuth = searchParams.get('type') === 'google' || 
                          user.app_metadata?.provider === 'google';
      const isTrialSignup = searchParams.get('from') === 'trial';
      
      console.log('Auth type:', { isGoogleAuth, isTrialSignup });

      // Get user profile
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

      console.log('Profile check result:', { profile, hasProfile: !!profile });

      // If on subdomain, verify tenant access
      if (domainConfig.isSubdomain && domainConfig.tenantId) {
        console.log('Verifying subdomain access for tenant:', domainConfig.tenantId);
        
        if (!profile) {
          setError('New users cannot access business workspaces directly. Please contact your administrator.');
          return;
        }

        // Check if user is a member of this tenant
        const { data: tenantUser, error: tenantUserError } = await supabase
          .from('tenant_users')
          .select('*')
          .eq('tenant_id', domainConfig.tenantId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (tenantUserError && tenantUserError.code !== 'PGRST116') {
          console.error('Tenant user check error:', tenantUserError);
          setError('Failed to verify access permissions. Please try again.');
          return;
        }

        if (!tenantUser) {
          // Get tenant name for better error message
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', domainConfig.tenantId)
            .single();
          
          const tenantName = tenant?.name || 'this business';
          setError(`You are not registered for ${tenantName}. Please contact your administrator or sign up on the main website.`);
          return;
        }

        console.log('User verified as member of tenant');
      } else if (domainConfig.isSubdomain && !domainConfig.tenantId) {
        setError('This business workspace does not exist.');
        return;
      }

      // Handle authentication flow
      if (isGoogleAuth) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Ensure profile creation is complete
        
        if (profile) {
          await updateGoogleUserProfile(user, profile);
        }

        // For subdomain users: if they have a profile and are verified as tenant member, they are existing users
        // For main domain: only show business form for trial signups without tenant
        const shouldShowBusinessForm = isTrialSignup && 
                                      !profile?.tenant_id && 
                                      !domainConfig.isSubdomain;
        
        setIsNewUser(shouldShowBusinessForm);
        setShowOTPModal(true);
      } else {
        // Regular email/password auth - proceed directly to OTP or dashboard
        await refreshUserInfo();
        await proceedAfterAuth();
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Unexpected callback error:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const proceedAfterAuth = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .maybeSingle();

    const domainConfig = await domainManager.getCurrentDomainConfig();

    if (profile?.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('subdomain, name')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantData?.subdomain) {
        const isOnCorrectSubdomain = domainConfig.isSubdomain && 
                                   domainConfig.tenantId === profile.tenant_id;
        
        if (isOnCorrectSubdomain) {
          toast({
            title: "Welcome back!",
            description: `Welcome to ${tenantData.name}`,
          });
          navigate('/dashboard');
          return;
        } else if (!domainConfig.isSubdomain) {
          // User is on main domain but has tenant - show instructions
          const currentDomain = window.location.hostname;
          const domainExtension = currentDomain.includes('vibenet.shop') ? 'vibenet.shop' : 
                                 currentDomain.includes('vibenet.online') ? 'vibenet.online' : 
                                 'online'; // Default for custom domains
          
          toast({
            title: "Login Successful!",
            description: `Please bookmark and visit: ${tenantData.subdomain}.${domainExtension}`,
          });
          
          setTimeout(() => {
            navigate('/?login=success&subdomain=' + tenantData.subdomain);
          }, 2000);
          return;
        } else {
          // User is on wrong subdomain - redirect to correct one
          const currentDomain = window.location.hostname;
          const domainExtension = currentDomain.includes('vibenet.shop') ? 'vibenet.shop' : 
                                 currentDomain.includes('vibenet.online') ? 'vibenet.online' : 
                                 'online'; // Default for custom domains
          const targetSubdomain = `${tenantData.subdomain}.${domainExtension}`;
          window.location.href = `https://${targetSubdomain}/dashboard`;
          return;
        }
      }
    }

    // User without tenant
    if (domainConfig.isSubdomain) {
      toast({
        title: "Access Denied",
        description: "You don't have access to this business workspace. Please sign up on the main website.",
        variant: "destructive"
      });
      
      setTimeout(() => {
        window.location.href = 'https://vibenet.shop/';
      }, 3000);
      return;
    }

    // User without tenant on main domain
    navigate('/dashboard');
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

  const handleOTPSuccess = async (businessData?: any) => {
    console.log('=== OTP SUCCESS HANDLER CALLED ===');
    console.log('isNewUser:', isNewUser);
    console.log('businessData received:', businessData);
    
    setShowOTPModal(false);
    
    try {
      await refreshUserInfo();
      
      // Check if user already has a tenant first
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('User profile tenant check:', profile);

      // If user has business data (from signup flow) and no tenant, create one
      if (businessData && !profile?.tenant_id) {
        console.log('User with business data but no tenant - creating tenant:', businessData);
        await createTenantForNewUser(businessData);
        return;
      }
      
      // Use unified approach for post-OTP navigation
      await proceedAfterAuth();
    } catch (error) {
      console.error('Navigation error:', error);
      setError('Login successful but navigation failed. Please refresh the page.');
    }
  };

  const createTenantForNewUser = async (businessData: any) => {
    try {
      console.log('=== STARTING TENANT CREATION ===');
      console.log('Creating tenant with business data:', businessData);
      console.log('User ID:', userId);
      
      toast({
        title: "Creating your workspace...",
        description: "Setting up your business account.",
      });

      console.log('About to call create-tenant-trial function...');
      
      // Create tenant with the complete business data
      const { data, error } = await supabase.functions.invoke('create-tenant-trial', {
        body: {
          userId: userId,
          businessData: businessData,
          planType: 'starter',
          isGoogleUser: true
        }
      });

      console.log('Function call completed. Response:', { data, error });

      if (error) {
        console.error('Tenant creation error:', error);
        throw error;
      }

      console.log('Tenant created successfully:', data);

      // Refresh user info to get the new tenant
      await refreshUserInfo();

      // Get the tenant info and redirect to subdomain
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
              toast({
                title: "Welcome to VibePOS!",
                description: `Check your email for login credentials to access ${tenantData.name} at ${tenantData.subdomain}.vibenet.shop`,
              });
              
              setTimeout(() => {
                navigate('/?signup=success&subdomain=' + tenantData.subdomain);
              }, 2000);
              return;
            }
      }

      throw new Error('Failed to get tenant information');
    } catch (error) {
      console.error('Tenant creation failed:', error);
      toast({
        title: "Setup Error",
        description: "Failed to create your workspace. Please try again.",
        variant: "destructive"
      });
      setError('Failed to create your workspace. Please try again.');
    }
  };

  const handleOTPClose = () => {
    setShowOTPModal(false);
    // Sign out the user since they didn't complete verification
    supabase.auth.signOut();
    
    // Check if we're on a subdomain and preserve it
    const currentDomain = window.location.hostname;
    const isMainDomain = currentDomain === 'vibenet.shop' || 
                        currentDomain === 'vibenet.online' ||
                        currentDomain === 'www.vibenet.shop' || 
                        currentDomain === 'www.vibenet.online';
    
    if (isMainDomain) {
      navigate('/auth');
    } else {
      // We're on a subdomain, stay on the subdomain's auth page
      navigate('/auth');
    }
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

      {/* Unified OTP Verification Modal for Both New and Existing Users */}
      <OTPVerificationModal
        isOpen={showOTPModal}
        onClose={handleOTPClose}
        onSuccess={handleOTPSuccess}
        email={userEmail}
        userId={userId}
        title="Verify Your Email"
        description={isNewUser 
          ? "Please complete your business information and verify your email to create your account."
          : "For security, we need to verify your email address before you can continue."
        }
        otpType={isNewUser ? "email_verification" : "login_verification"}
        isNewUser={isNewUser}
        userFullName={userFullName}
      />
    </div>
  );
}
